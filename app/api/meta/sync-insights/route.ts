import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAdAccounts, getMetaAdsWithCreatives, getMetaCampaignInsights, getMetaCampaigns, metaErrorResponse } from "@/lib/meta/facebook";
import { normalizeCampaignInsights, normalizeCreativePerformance } from "@/lib/reports/ads-report";
import { createAdminClient } from "@/lib/supabase/admin";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("meta_sync_runs");
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      start_date?: string;
      end_date?: string;
      ad_account_ids?: string[];
    };
    const range = {
      startDate: body.start_date || defaultDateRange().startDate,
      endDate: body.end_date || defaultDateRange().endDate
    };
    const accessToken = await requireFacebookProviderToken();
    const admin = createAdminClient();

    const { data: run, error: runError } = await admin
      .from("meta_sync_runs")
      .insert({
        user_id: session.userId,
        status: "running",
        date_start: range.startDate,
        date_end: range.endDate
      })
      .select("id")
      .single();

    if (runError) {
      if (isMissingTable(runError)) {
        return NextResponse.json(
          {
            error: "Chưa có bảng lưu dữ liệu Meta. Hãy chạy migration 202605210004_create_meta_optimization_tables.sql.",
            storage: "missing_schema"
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: runError.message }, { status: 500 });
    }

    const accounts = await getMetaAdAccounts(accessToken);
    const selected = body.ad_account_ids?.length
      ? accounts.filter((account) => body.ad_account_ids?.includes(account.id) || body.ad_account_ids?.includes(account.account_id || ""))
      : accounts;

    let campaignCount = 0;
    let adCount = 0;

    for (const account of selected) {
      await admin.from("meta_account_snapshots").upsert(
        {
          user_id: session.userId,
          sync_run_id: run.id,
          ad_account_id: account.id,
          account_name: account.name || null,
          currency: account.currency || null,
          timezone_name: account.timezone_name || null,
          account_status: account.account_status || null,
          business_id: account.business?.id || null,
          business_name: account.business?.name || null,
          snapshot_date: range.endDate,
          raw_json: account
        },
        { onConflict: "user_id,ad_account_id,snapshot_date" }
      );

      const [campaigns, insights, ads] = await Promise.all([
        getMetaCampaigns(account.id, accessToken),
        getMetaCampaignInsights(account.id, range, accessToken).catch(() => []),
        getMetaAdsWithCreatives(account.id, range, accessToken).catch(() => [])
      ]);

      const normalizedCampaigns = normalizeCampaignInsights(insights, campaigns);
      const normalizedCreatives = normalizeCreativePerformance(ads);
      campaignCount += normalizedCampaigns.length;
      adCount += normalizedCreatives.length;

      if (normalizedCampaigns.length) {
        const { error } = await admin.from("meta_campaign_snapshots").upsert(
          normalizedCampaigns.map((campaign) => ({
            user_id: session.userId,
            sync_run_id: run.id,
            ad_account_id: account.id,
            campaign_id: campaign.campaignId,
            campaign_name: campaign.campaignName,
            status: campaign.status || null,
            objective: campaign.objective || null,
            date_start: range.startDate,
            date_end: range.endDate,
            spend: campaign.spend,
            impressions: campaign.impressions,
            reach: campaign.reach,
            clicks: campaign.clicks,
            leads: campaign.leads,
            messages: campaign.messages,
            engagements: campaign.engagements,
            purchases: campaign.purchases,
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            cpm: campaign.cpm,
            cost_per_result: campaign.costPerResult,
            roas: campaign.roas,
            conversion_value: campaign.conversionValue,
            raw_json: campaign
          })),
          { onConflict: "user_id,ad_account_id,campaign_id,date_start,date_end" }
        );
        if (error) throw new Error(error.message);
      }

      if (normalizedCreatives.length) {
        const { error } = await admin.from("meta_ad_creative_snapshots").upsert(
          normalizedCreatives.map((creative) => ({
            user_id: session.userId,
            sync_run_id: run.id,
            ad_account_id: account.id,
            campaign_id: creative.campaignId || null,
            campaign_name: creative.campaignName,
            adset_id: creative.adsetId || null,
            adset_name: creative.adsetName,
            ad_id: creative.adId,
            ad_name: creative.adName,
            creative_id: creative.creativeId,
            creative_name: creative.creativeName,
            post_id: creative.postId,
            post_url: creative.postUrl,
            format: creative.format,
            body: creative.body,
            headline: creative.headline,
            description: creative.description,
            cta: creative.cta,
            landing_url: creative.landingUrl,
            audience_age_range: creative.audienceAgeRange,
            audience_gender: creative.audienceGender,
            audience_locations: creative.audienceLocations,
            audience_interests: creative.audienceInterests,
            audience_behaviors: creative.audienceBehaviors,
            date_start: range.startDate,
            date_end: range.endDate,
            spend: creative.spend,
            impressions: creative.impressions,
            reach: creative.reach,
            leads: creative.leads,
            messages: creative.messages,
            engagements: creative.engagements,
            ctr: creative.ctr,
            cpc: creative.cpc,
            cpm: creative.cpm,
            cpl: creative.cpl,
            cost_per_message: creative.costPerMessage,
            raw_json: creative
          })),
          { onConflict: "user_id,ad_account_id,ad_id,date_start,date_end" }
        );
        if (error) throw new Error(error.message);
      }
    }

    await admin
      .from("meta_sync_runs")
      .update({
        status: "completed",
        account_count: selected.length,
        campaign_count: campaignCount,
        ad_count: adCount,
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id);

    return NextResponse.json({
      data: {
        sync_run_id: run.id,
        account_count: selected.length,
        campaign_count: campaignCount,
        ad_count: adCount,
        date_range: range
      }
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
