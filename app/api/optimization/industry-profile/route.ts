import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";
import { inferIndustryProfileFromSnapshots } from "@/lib/optimization/industry-inference";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("account_industry_profiles");
}

async function canManageIndustryProfile() {
  try {
    await requireAdminRole();
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const url = new URL(request.url);
  const adAccountId = url.searchParams.get("ad_account_id");
  if (!adAccountId) return NextResponse.json({ error: "Chưa chọn tài khoản quảng cáo." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_industry_profiles")
    .select("*")
    .eq("user_id", session.userId)
    .eq("ad_account_id", adAccountId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: null, storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function PATCH(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  if (!(await canManageIndustryProfile())) {
    return NextResponse.json({ error: "Chỉ quản trị viên được cập nhật hồ sơ ngành hàng nội bộ." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    ad_account_id?: string;
    industry_key?: string;
    business_model?: string;
    offer_type?: string;
    average_order_value?: number | string | null;
    target_customer?: string;
    notes?: string;
  };

  if (!body.ad_account_id) return NextResponse.json({ error: "Chưa chọn tài khoản quảng cáo." }, { status: 400 });
  if (!body.industry_key) return NextResponse.json({ error: "Chưa chọn ngành hàng." }, { status: 400 });

  const averageOrderValue = body.average_order_value === "" || body.average_order_value === null
    ? null
    : Number(body.average_order_value);

  if (averageOrderValue !== null && !Number.isFinite(averageOrderValue)) {
    return NextResponse.json({ error: "Giá trị đơn hàng trung bình không hợp lệ." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_industry_profiles")
    .upsert(
      {
        user_id: session.userId,
        ad_account_id: body.ad_account_id,
        industry_key: body.industry_key,
        business_model: body.business_model || null,
        offer_type: body.offer_type || null,
        average_order_value: averageOrderValue,
        target_customer: body.target_customer || null,
        notes: body.notes || null
      },
      { onConflict: "user_id,ad_account_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: "Chưa có bảng account_industry_profiles. Hãy chạy migration 202605210006_create_account_industry_profiles.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });
  if (!(await canManageIndustryProfile())) {
    return NextResponse.json({ error: "Chỉ quản trị viên được suy luận hồ sơ ngành hàng nội bộ." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { ad_account_id?: string };
  if (!body.ad_account_id) return NextResponse.json({ error: "Chưa chọn tài khoản quảng cáo." }, { status: 400 });

  const admin = createAdminClient();
  const [campaignResult, creativeResult] = await Promise.all([
    admin
      .from("meta_campaign_snapshots")
      .select("campaign_name,objective,spend,cost_per_result,leads,messages,created_at")
      .eq("user_id", session.userId)
      .eq("ad_account_id", body.ad_account_id)
      .order("created_at", { ascending: false })
      .limit(300),
    admin
      .from("meta_ad_creative_snapshots")
      .select("campaign_name,adset_name,ad_name,body,headline,description,cta,audience_age_range,audience_gender,audience_locations,audience_interests,audience_behaviors,spend,leads,messages,created_at")
      .eq("user_id", session.userId)
      .eq("ad_account_id", body.ad_account_id)
      .order("created_at", { ascending: false })
      .limit(300)
  ]);

  if (campaignResult.error) {
    if (isMissingTable(campaignResult.error)) return NextResponse.json({ error: "Chưa có dữ liệu Meta đã sync. Hãy đồng bộ dữ liệu trước." }, { status: 500 });
    return NextResponse.json({ error: campaignResult.error.message }, { status: 500 });
  }
  if (creativeResult.error) {
    if (isMissingTable(creativeResult.error)) return NextResponse.json({ error: "Chưa có dữ liệu creative đã sync. Hãy đồng bộ dữ liệu trước." }, { status: 500 });
    return NextResponse.json({ error: creativeResult.error.message }, { status: 500 });
  }

  const inferred = inferIndustryProfileFromSnapshots(campaignResult.data ?? [], creativeResult.data ?? []);
  const { data, error } = await admin
    .from("account_industry_profiles")
    .upsert(
      {
        user_id: session.userId,
        ad_account_id: body.ad_account_id,
        ...inferred
      },
      { onConflict: "user_id,ad_account_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: "Chưa có bảng account_industry_profiles. Hãy chạy migration 202605210006_create_account_industry_profiles.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, source: { campaigns: campaignResult.data?.length ?? 0, creatives: creativeResult.data?.length ?? 0 } });
}
