import { adsContentPackageSchema, type AdsContentInput, type AdsContentPackage } from "./ai-content-ads-shared";

export type AdsContentIndustryContext = {
  industryKey?: string | null;
  businessModel?: string | null;
  offerType?: string | null;
  averageOrderValue?: number | string | null;
  targetCustomer?: string | null;
  notes?: string | null;
};

function getGeminiText(payload: unknown) {
  const candidate = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0];
  return candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || trimmed;
}

export function buildAdsContentPrompt(input: AdsContentInput, industryContext?: AdsContentIndustryContext | null) {
  return [
    "Bạn là chuyên gia creator ads và direct-response copywriter cho chủ doanh nghiệp Việt Nam.",
    "Viết nội dung quảng cáo Facebook dễ hiểu, có lực bán hàng, không phóng đại, không cam kết kết quả y tế/tài chính tuyệt đối.",
    "Tạo nhiều góc content để khách có thể test creative. Không dùng emoji quá nhiều. Không bịa bằng chứng.",
    "Nếu có hồ sơ ngành/tài khoản quảng cáo, hãy dùng làm ngữ cảnh ưu tiên. Không nhắc rằng bạn có dữ liệu nội bộ; chỉ biến nó thành content sắc hơn, đúng ngành hơn.",
    "Chỉ trả về JSON đúng schema:",
    JSON.stringify({
      summary: "Tóm tắt chiến lược content",
      angles: ["Góc quảng cáo 1", "Góc quảng cáo 2"],
      hooks: ["Hook mở đầu"],
      primaryTexts: ["Nội dung chính"],
      headlines: ["Tiêu đề ngắn"],
      descriptions: ["Mô tả ngắn"],
      ctas: ["CTA"],
      creativeBriefs: ["Gợi ý hình/video cần quay"],
      complianceNotes: ["Lưu ý chính sách/quảng cáo"],
      recommendedTestPlan: "Nên test nội dung thế nào"
    }),
    "",
    "Thông tin sản phẩm:",
    JSON.stringify(input, null, 2),
    "",
    "Hồ sơ ngành/tài khoản quảng cáo nếu có:",
    JSON.stringify(industryContext ?? { status: "not_provided" }, null, 2)
  ].join("\n");
}

export async function generateAdsContentPackage(
  input: AdsContentInput,
  options?: { industryContext?: AdsContentIndustryContext | null }
): Promise<AdsContentPackage & { raw: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình Gemini API key.");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildAdsContentPrompt(input, options?.industryContext) }] }],
      generationConfig: {
        temperature: 0.55,
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini chưa phản hồi được (${response.status}). Hãy kiểm tra API key hoặc quota.`);
  }

  const raw = getGeminiText(await response.json());
  const parsed = adsContentPackageSchema.parse(JSON.parse(extractJson(raw)));
  return { ...parsed, raw };
}
