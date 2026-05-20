import type { CampaignBuilderInput } from "@/lib/meta/types";
import { consultantResponseSchema, type AIConsultantResponse } from "@/lib/ai-consultant-shared";

function getGeminiText(payload: unknown) {
  const candidate = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0];
  return candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || trimmed;
}

export async function askGeminiAdsConsultant({
  message,
  context
}: {
  message: string;
  context?: Partial<CampaignBuilderInput>;
}): Promise<AIConsultantResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình Gemini API key.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt = [
    "Bạn là chuyên gia Facebook Ads lâu năm cho chủ doanh nghiệp nhỏ tại Việt Nam.",
    "Nói dễ hiểu, hỏi ít nhưng đúng. Không dùng thuật ngữ khó nếu không cần.",
    "Mục tiêu là giúp người dùng chọn scale camp cũ, tạo camp mới hoặc test A/B.",
    "Nếu thiếu dữ liệu, hãy ghi rõ trong missingFields. Không bịa dữ liệu.",
    "Chỉ trả về JSON đúng dạng:",
    JSON.stringify({
      advice: "Tư vấn ngắn gọn bằng tiếng Việt",
      plan: {
        mode: "new_campaign | scale_campaign | ab_test",
        objective: "",
        product: "",
        dailyBudget: 0,
        location: "",
        ageRange: "",
        gender: "",
        pageId: "",
        postId: "",
        audienceDescription: "",
        recommendedStructure: "1-1-1 | 1-3-3 | custom",
        reason: "",
        campaignDraft: {},
        missingFields: [],
        canCreatePreview: true
      }
    }),
    "",
    "Thông tin form hiện tại:",
    JSON.stringify(context ?? {}, null, 2),
    "",
    "Tin nhắn của khách:",
    message
  ].join("\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini chưa phản hồi được (${response.status}). Hãy kiểm tra API key hoặc quota.`);
  }

  const raw = getGeminiText(await response.json());
  const parsed = consultantResponseSchema.parse(JSON.parse(extractJson(raw)));
  return { advice: parsed.advice, plan: parsed.plan, raw };
}
