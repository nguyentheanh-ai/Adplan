import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { generateAdsContentPackage } from "@/lib/ai-content-ads";
import { adsContentInputSchema } from "@/lib/ai-content-ads-shared";

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const input = adsContentInputSchema.parse(await request.json());
    const data = await generateAdsContentPackage(input);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo content quảng cáo lúc này.";
    const missingKey = message.toLowerCase().includes("gemini api key");
    return NextResponse.json({ error: message }, { status: missingKey ? 503 : 400 });
  }
}
