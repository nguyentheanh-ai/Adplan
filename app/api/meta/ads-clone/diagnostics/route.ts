import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { metaAdsCloneDiagnostics } from "@/lib/meta/ad-clone";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";

const diagnosticsSchema = z.object({
  ad_account_id: z.string().min(3),
  source_ad_id: z.string().min(3),
  target_adset_id: z.string().min(3).optional().nullable()
});

function getMetaAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Thiếu META_APP_ID hoặc META_APP_SECRET để kiểm tra token.");
  }
  return { appId, appSecret };
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

    const body = diagnosticsSchema.parse(await request.json());
    const accessToken = await requireFacebookProviderToken();
    const { appId, appSecret } = getMetaAppConfig();
    const diagnostics = await metaAdsCloneDiagnostics({
      accessToken,
      appId,
      appSecret,
      adAccountId: body.ad_account_id,
      sourceAdId: body.source_ad_id,
      targetAdSetId: body.target_adset_id
    });

    return NextResponse.json({ data: diagnostics });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể kiểm tra trước khi nhân bản." },
      { status: 400 }
    );
  }
}
