import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { defaultOptimizationWindow, normalizeOptimizationWindow } from "@/lib/optimization/authorization-window";
import { createAdminClient } from "@/lib/supabase/admin";

const authorizationSchema = z.object({
  ad_account_id: z.string().trim().min(3),
  status: z.enum(["disabled", "enabled"]).default("disabled"),
  allowed_actions: z.array(z.string()).default([]),
  max_daily_budget_change_percent: z.coerce.number().min(0).max(100).default(20),
  max_daily_budget_change_amount: z.coerce.number().min(0).optional().nullable(),
  require_manual_approval: z.boolean().default(true),
  optimization_window: z
    .object({
      enabled: z.boolean().default(defaultOptimizationWindow.enabled),
      start: z.string().trim().default(defaultOptimizationWindow.start),
      end: z.string().trim().default(defaultOptimizationWindow.end),
      timezone: z.string().trim().default(defaultOptimizationWindow.timezone)
    })
    .optional()
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("optimization_authorizations");
}

function isMissingOptimizationWindowColumn(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "PGRST204" || message.includes("optimization_window");
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const url = new URL(request.url);
  const adAccountId = url.searchParams.get("ad_account_id");
  if (!adAccountId) return NextResponse.json({ error: "Chưa chọn tài khoản quảng cáo." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("optimization_authorizations")
    .select("*")
    .eq("user_id", session.userId)
    .eq("ad_account_id", adAccountId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: null, storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const body = authorizationSchema.parse(await request.json());
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("optimization_authorizations")
    .upsert(
      {
        user_id: session.userId,
        ad_account_id: body.ad_account_id,
        status: body.status,
        allowed_actions: body.allowed_actions,
        max_daily_budget_change_percent: body.max_daily_budget_change_percent,
        max_daily_budget_change_amount: body.max_daily_budget_change_amount ?? null,
        require_manual_approval: body.require_manual_approval,
        optimization_window: normalizeOptimizationWindow(body.optimization_window),
        authorized_by: session.name || session.facebookId,
        authorized_at: body.status === "enabled" ? now : null,
        revoked_at: body.status === "disabled" ? now : null
      },
      { onConflict: "user_id,ad_account_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingOptimizationWindowColumn(error)) {
      return NextResponse.json(
        { error: "Chưa có cột khung giờ tối ưu. Hãy chạy migration 202605210008_add_optimization_authorization_window.sql trong Supabase." },
        { status: 500 }
      );
    }
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: "Chưa có bảng ủy quyền tối ưu. Hãy chạy migration 202605210004_create_meta_optimization_tables.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
