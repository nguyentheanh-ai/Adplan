import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { generateAdsContentPackage, type AdsContentIndustryContext } from "@/lib/ai-content-ads";
import { adsContentInputSchema } from "@/lib/ai-content-ads-shared";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = adsContentInputSchema.extend({
  ad_account_id: z.string().trim().optional(),
  adAccountId: z.string().trim().optional()
});

function isMissingIndustryTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("account_industry_profiles");
}

async function loadIndustryContext(userId: string, adAccountId?: string): Promise<AdsContentIndustryContext | null> {
  if (!adAccountId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_industry_profiles")
    .select("industry_key,business_model,offer_type,average_order_value,target_customer,notes")
    .eq("user_id", userId)
    .eq("ad_account_id", adAccountId)
    .maybeSingle();

  if (error) {
    if (isMissingIndustryTable(error)) return null;
    throw new Error(error.message);
  }

  if (!data) return null;
  return {
    industryKey: data.industry_key,
    businessModel: data.business_model,
    offerType: data.offer_type,
    averageOrderValue: data.average_order_value,
    targetCustomer: data.target_customer,
    notes: data.notes
  };
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const parsed = requestSchema.parse(await request.json());
    const adAccountId = parsed.ad_account_id || parsed.adAccountId;
    const input = adsContentInputSchema.parse(parsed);
    const industryContext = await loadIndustryContext(session.userId, adAccountId);
    const data = await generateAdsContentPackage(input, { industryContext });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo content quảng cáo lúc này.";
    const missingKey = message.toLowerCase().includes("gemini api key");
    return NextResponse.json({ error: message }, { status: missingKey ? 503 : 400 });
  }
}
