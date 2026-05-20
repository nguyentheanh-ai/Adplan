import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const sendToN8nSchema = z.object({
  outputId: z.string().uuid().optional(),
  ads_plan_json: z.unknown().optional()
});

export async function POST(request: Request) {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json(
        { error: "Thiếu cấu hình Supabase server. Vui lòng kiểm tra .env.local." },
        { status: 500 }
      );
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Chưa cấu hình N8N_WEBHOOK_URL nên chưa thể gửi kế hoạch sang n8n." },
        { status: 400 }
      );
    }

    const body = sendToN8nSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để gửi kế hoạch." }, { status: 401 });
    }

    let payload = body.ads_plan_json;

    if (body.outputId) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("ai_outputs")
        .select("id, project_id, session_id, ads_plan_json")
        .eq("id", body.outputId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        throw new Error("Không tìm thấy kế hoạch cần gửi.");
      }

      payload = data;
    }

    if (!payload) {
      return NextResponse.json({ error: "Thiếu dữ liệu kế hoạch để gửi." }, { status: 400 });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`n8n trả về lỗi ${response.status}.`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi sang n8n.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
