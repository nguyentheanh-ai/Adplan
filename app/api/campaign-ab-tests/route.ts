import { NextResponse } from "next/server";
import { z } from "zod";
import { createABTestDraft, validateABTestConfig } from "@/lib/campaign-builder";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const abTestSchema = z.object({
  account_id: z.string().min(3),
  name: z.string().trim().min(1),
  hypothesis: z.string().trim().default(""),
  test_variable: z.enum(["creative", "audience", "placement", "copy"]).default("creative"),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  minimum_spend: z.string().default(""),
  variants: z.array(z.string().trim().min(1)).min(1)
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("campaign_ab_tests") || message.includes("schema cache");
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Ban can dang nhap." }, { status: 401 });

  const body = abTestSchema.parse(await request.json());
  const draft = createABTestDraft({
    name: body.name,
    hypothesis: body.hypothesis,
    testVariable: body.test_variable,
    schedule: { startDate: body.start_date, endDate: body.end_date },
    minimumSpend: body.minimum_spend,
    variants: body.variants
  });
  const validation = validateABTestConfig(draft);
  if (!validation.ok) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("campaign_ab_tests")
    .insert({
      user_id: session.userId,
      account_id: body.account_id,
      name: draft.name,
      hypothesis: draft.hypothesis,
      test_variable: draft.testVariable,
      status: "draft",
      budget_split: draft.budgetSplit,
      schedule_json: draft.schedule,
      winner_rule_json: draft.winnerRule,
      preview_json: draft
    })
    .select("id,user_id,account_id,name,hypothesis,test_variable,status,budget_split,schedule_json,winner_rule_json,preview_json,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        storage: "local",
        data: {
          id: `local-${Date.now()}`,
          user_id: session.userId,
          account_id: body.account_id,
          preview_json: draft,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const variants = draft.variants.map((variant) => ({
    ab_test_id: data.id,
    user_id: session.userId,
    name: variant.name,
    variant_type: variant.variable,
    payload: variant.payload
  }));

  const variantResult = await admin.from("campaign_ab_test_variants").insert(variants);
  if (variantResult.error && !isMissingTable(variantResult.error)) {
    return NextResponse.json({ error: variantResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, variants: draft.variants } });
}
