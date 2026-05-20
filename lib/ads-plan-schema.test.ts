import { describe, expect, it } from "vitest";
import { parseAdsPlanJson } from "./ads-plan-schema";

const validPlan = {
  business_summary: {
    industry: "Spa",
    offer: "Chăm sóc da",
    price_range: "500.000đ",
    main_goal: "inbox",
    budget: "300.000đ/ngày"
  },
  customer_persona: {
    primary_customer: "Nữ 25-40 tuổi",
    location: "TP.HCM",
    pain_points: ["Da mụn"],
    buying_triggers: ["Cam kết liệu trình rõ"],
    objections: ["Sợ không hiệu quả"],
    customer_insight: "Muốn đẹp hơn nhưng cần bằng chứng tin cậy."
  },
  positioning: {
    main_message: "Da khỏe hơn với liệu trình cá nhân hóa.",
    proof_points: ["Tư vấn soi da"],
    risk_notes: ["Không cam kết quá mức"]
  },
  campaign_plan: {
    recommended_campaign_count: 1,
    recommended_adset_count: 2,
    recommended_creative_count: 3,
    budget_split: [
      {
        stage: "Testing",
        percentage: 70,
        amount: "210.000đ/ngày",
        reason: "Tìm nhóm phản hồi tốt"
      }
    ],
    campaigns: [
      {
        campaign_name: "Inbox tư vấn da",
        objective: "Messages",
        purpose: "Tạo hội thoại tư vấn",
        adsets: [
          {
            adset_name: "Nữ văn phòng",
            audience: "Nữ 25-40",
            location: "TP.HCM",
            budget: "150.000đ/ngày",
            creative_angles: ["Trước/sau"],
            sample_copy: ["Da mụn khiến bạn mất tự tin?"]
          }
        ]
      }
    ]
  },
  execution_checklist: ["Chuẩn bị ảnh thật"],
  warnings: ["Không dùng claim y tế"]
};

describe("parseAdsPlanJson", () => {
  it("accepts valid Gemini JSON", () => {
    expect(parseAdsPlanJson(JSON.stringify(validPlan))).toEqual(validPlan);
  });

  it("extracts JSON from fenced markdown", () => {
    expect(parseAdsPlanJson(`\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``).business_summary.industry).toBe("Spa");
  });

  it("rejects missing required structured sections", () => {
    expect(() => parseAdsPlanJson(JSON.stringify({ business_summary: {} }))).toThrow();
  });
});
