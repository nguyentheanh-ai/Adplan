import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { createPausedMetaCampaign, metaErrorResponse } from "@/lib/meta/facebook";

const createCampaignSchema = z.object({
  ad_account_id: z.string().trim().min(3, "Vui lòng chọn tài khoản quảng cáo."),
  name: z.string().trim().min(3, "Tên campaign phải có ít nhất 3 ký tự."),
  objective: z.enum(["OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_AWARENESS"]).default("OUTCOME_TRAFFIC")
});

export async function POST(request: Request) {
  try {
    const body = createCampaignSchema.parse(await request.json());
    const accessToken = await requireFacebookProviderToken();
    const campaign = await createPausedMetaCampaign({
      name: body.name,
      objective: body.objective,
      adAccountId: body.ad_account_id,
      accessToken
    });

    return NextResponse.json({
      id: campaign.id,
      ad_account_id: body.ad_account_id,
      name: body.name,
      objective: body.objective,
      status: "PAUSED"
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
