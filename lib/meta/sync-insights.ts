import "server-only";
import { getMetaAdAccounts, getMetaAdsWithCreatives, getMetaCampaignInsights, getMetaCampaigns } from "@/lib/meta/facebook";
import { normalizeCampaignInsights, normalizeCreativePerformance } from "@/lib/reports/ads-report";
import { createAdminClient } from "@/lib/supabase/admin";

export type MetaSyncRange = {
  startDate: string;
  endDate: string;
};

export type MetaSyncResult = {
  sync_run_id: string;
  account_count: number;
  campaign_count: number;
  ad_count: number;
  date_range: MetaSyncRange;
};

export function defaultMetaSyncRange(): MetaSyncRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

export function isMissingMetaSyncTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("meta_sync_runs");
}

export async function syncMetaInsightsForUser({
  userId,
  accessToken,
  range = defaultMetaSyncRange(),
  adAccountIds
}: {
  userId: string;
  accessToken: string;
  range?: MetaSyncRange;
  adAccountIds?: string[];
}): Promise<MetaSyncResult> {
  const admin = createAdminClient();

  const { data: run, error: runError } = await admin
    .from("meta_sync_runs")
    .insert({
      user_id: userId,
      status: "running",
      date_start: range.startDate,
      date_end: range.endDate
    })
    .select("id")
    .single();

  if (runError) throw runError;

  try {
    const accounts = await getMetaAdAccounts(accessToken);
    const selected = adAccountIds?.length
      ? accounts.filter((account) => adAccountIds.includes(account.id) || adAccountIds.includes(account.account_id || ""))
      : accounts;

    let campaignCount = 0;
    let adCount = 0;

    for (const account of selected) {
      await admin.from("meta_account_snapshots").upsert(
        {
          user_id: userId,
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
            user_id: userId,
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
            user_id: userId,
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

    return {
      sync_run_id: run.id,
      account_count: selected.length,
      campaign_count: campaignCount,
      ad_count: adCount,
      date_range: range
    };
  } catch (error) {
    const { error: updateError } = await admin
      .from("meta_sync_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Không thể đồng bộ dữ liệu Meta.",
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id);
    if (updateError && !isMissingMetaSyncTable(updateError)) {
      console.error("Could not mark Meta sync run as failed", updateError);
    }
    throw error;
  }
}
