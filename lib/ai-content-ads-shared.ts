import { z } from "zod";

export const adsContentInputSchema = z.object({
  product: z.string().trim().min(2, "Nhập sản phẩm/dịch vụ."),
  industry: z.string().trim().optional().default(""),
  targetCustomer: z.string().trim().optional().default(""),
  offer: z.string().trim().optional().default(""),
  salesPolicy: z.string().trim().optional().default(""),
  objections: z.string().trim().optional().default(""),
  tone: z.string().trim().optional().default("thẳng, dễ hiểu, có lực bán hàng"),
  goal: z.enum(["message", "lead", "traffic", "engagement", "sales"]).default("message")
});

export const adsContentPackageSchema = z.object({
  summary: z.string(),
  angles: z.array(z.string()).min(1),
  hooks: z.array(z.string()).min(1),
  primaryTexts: z.array(z.string()).min(1),
  headlines: z.array(z.string()).min(1),
  descriptions: z.array(z.string()).min(1),
  ctas: z.array(z.string()).min(1),
  creativeBriefs: z.array(z.string()).min(1),
  complianceNotes: z.array(z.string()).default([]),
  recommendedTestPlan: z.string()
});

export type AdsContentInput = z.infer<typeof adsContentInputSchema>;
export type AdsContentPackage = z.infer<typeof adsContentPackageSchema>;
