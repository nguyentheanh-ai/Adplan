import { z } from "zod";

export const plannerAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1)
});

export const analyzeRequestSchema = z.object({
  answers: z.array(plannerAnswerSchema).min(1),
  projectId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional()
});

const stringArray = z.array(z.string()).default([]);

export const adsPlanOutputSchema = z.object({
  business_summary: z.object({
    industry: z.string().default(""),
    offer: z.string().default(""),
    price_range: z.string().default(""),
    main_goal: z.string().default(""),
    budget: z.string().default("")
  }),
  customer_persona: z.object({
    primary_customer: z.string().default(""),
    location: z.string().default(""),
    pain_points: stringArray,
    buying_triggers: stringArray,
    objections: stringArray,
    customer_insight: z.string().default("")
  }),
  positioning: z.object({
    main_message: z.string().default(""),
    proof_points: stringArray,
    risk_notes: stringArray
  }),
  campaign_plan: z.object({
    recommended_campaign_count: z.number().int().nonnegative().default(0),
    recommended_adset_count: z.number().int().nonnegative().default(0),
    recommended_creative_count: z.number().int().nonnegative().default(0),
    budget_split: z
      .array(
        z.object({
          stage: z.string().default(""),
          percentage: z.number().min(0).max(100).default(0),
          amount: z.string().default(""),
          reason: z.string().default("")
        })
      )
      .default([]),
    campaigns: z
      .array(
        z.object({
          campaign_name: z.string().default(""),
          objective: z.string().default(""),
          purpose: z.string().default(""),
          adsets: z
            .array(
              z.object({
                adset_name: z.string().default(""),
                audience: z.string().default(""),
                location: z.string().default(""),
                budget: z.string().default(""),
                creative_angles: stringArray,
                sample_copy: stringArray
              })
            )
            .default([])
        })
      )
      .default([])
  }),
  execution_checklist: stringArray,
  warnings: stringArray
});

export type AdsPlanOutput = z.infer<typeof adsPlanOutputSchema>;
export type AnalyzeAdsPlanRequest = z.infer<typeof analyzeRequestSchema>;

export function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export function parseAdsPlanJson(raw: string) {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as unknown;
  return adsPlanOutputSchema.parse(parsed);
}

export function toGeminiResponseSchema() {
  return {
    type: "object",
    properties: {
      business_summary: {
        type: "object",
        properties: {
          industry: { type: "string" },
          offer: { type: "string" },
          price_range: { type: "string" },
          main_goal: { type: "string" },
          budget: { type: "string" }
        },
        required: ["industry", "offer", "price_range", "main_goal", "budget"]
      },
      customer_persona: {
        type: "object",
        properties: {
          primary_customer: { type: "string" },
          location: { type: "string" },
          pain_points: { type: "array", items: { type: "string" } },
          buying_triggers: { type: "array", items: { type: "string" } },
          objections: { type: "array", items: { type: "string" } },
          customer_insight: { type: "string" }
        },
        required: [
          "primary_customer",
          "location",
          "pain_points",
          "buying_triggers",
          "objections",
          "customer_insight"
        ]
      },
      positioning: {
        type: "object",
        properties: {
          main_message: { type: "string" },
          proof_points: { type: "array", items: { type: "string" } },
          risk_notes: { type: "array", items: { type: "string" } }
        },
        required: ["main_message", "proof_points", "risk_notes"]
      },
      campaign_plan: {
        type: "object",
        properties: {
          recommended_campaign_count: { type: "number" },
          recommended_adset_count: { type: "number" },
          recommended_creative_count: { type: "number" },
          budget_split: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stage: { type: "string" },
                percentage: { type: "number" },
                amount: { type: "string" },
                reason: { type: "string" }
              },
              required: ["stage", "percentage", "amount", "reason"]
            }
          },
          campaigns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                campaign_name: { type: "string" },
                objective: { type: "string" },
                purpose: { type: "string" },
                adsets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      adset_name: { type: "string" },
                      audience: { type: "string" },
                      location: { type: "string" },
                      budget: { type: "string" },
                      creative_angles: { type: "array", items: { type: "string" } },
                      sample_copy: { type: "array", items: { type: "string" } }
                    },
                    required: [
                      "adset_name",
                      "audience",
                      "location",
                      "budget",
                      "creative_angles",
                      "sample_copy"
                    ]
                  }
                }
              },
              required: ["campaign_name", "objective", "purpose", "adsets"]
            }
          }
        },
        required: [
          "recommended_campaign_count",
          "recommended_adset_count",
          "recommended_creative_count",
          "budget_split",
          "campaigns"
        ]
      },
      execution_checklist: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } }
    },
    required: [
      "business_summary",
      "customer_persona",
      "positioning",
      "campaign_plan",
      "execution_checklist",
      "warnings"
    ]
  };
}
