import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { askGeminiAdsConsultant } from "@/lib/ai-consultant";

const consultantSchema = z.object({
  message: z.string().trim().min(3),
  context: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = consultantSchema.parse(await request.json());
    const result = await askGeminiAdsConsultant({
      message: body.message,
      context: body.context
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể hỏi AI tư vấn lúc này.";
    const missingKey = message.toLowerCase().includes("gemini api key");
    return NextResponse.json({ error: message }, { status: missingKey ? 503 : 400 });
  }
}
