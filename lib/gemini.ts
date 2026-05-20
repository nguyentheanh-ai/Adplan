import {
  parseAdsPlanJson,
  toGeminiResponseSchema,
  type AdsPlanOutput,
  type AnalyzeAdsPlanRequest
} from "@/lib/ads-plan-schema";

const GEMINI_PROMPT =
  "Bạn là chuyên gia Facebook Ads và chiến lược marketing cho SME tại Việt Nam. Dựa trên câu trả lời của khách hàng, hãy phân tích chân dung khách hàng mục tiêu và tạo kế hoạch quảng cáo Facebook Ads ở mức có thể triển khai. Không bịa dữ liệu. Nếu thiếu thông tin, hãy nêu giả định rõ ràng. Trả về JSON đúng schema.";

function buildPrompt(answers: AnalyzeAdsPlanRequest["answers"]) {
  const answerText = answers
    .map((item, index) => `${index + 1}. ${item.question}\nTrả lời: ${item.answer}`)
    .join("\n\n");

  return `${GEMINI_PROMPT}\n\nCâu trả lời của khách hàng:\n${answerText}`;
}

function getGeminiText(payload: unknown) {
  const candidate = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0];
  return candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY trong môi trường server.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          response_mime_type: "application/json",
          response_schema: toGeminiResponseSchema()
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API lỗi ${response.status}: ${errorText}`);
  }

  return getGeminiText(await response.json());
}

export async function analyzeAdsPlanWithGemini(
  answers: AnalyzeAdsPlanRequest["answers"]
): Promise<{ output: AdsPlanOutput; raw: string }> {
  const prompt = buildPrompt(answers);
  let raw = await callGemini(prompt);

  try {
    return { output: parseAdsPlanJson(raw), raw };
  } catch {
    raw = await callGemini(`${prompt}\n\nLần trước JSON không hợp lệ. Chỉ trả về JSON thuần đúng schema, không thêm markdown.`);
    return { output: parseAdsPlanJson(raw), raw };
  }
}
