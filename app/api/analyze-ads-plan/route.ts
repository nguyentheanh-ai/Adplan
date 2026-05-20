import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/auth/session";
import { analyzeRequestSchema } from "@/lib/ads-plan-schema";
import { hasSupabaseServerEnv } from "@/lib/env";
import { analyzeAdsPlanWithGemini } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json(
        { error: "Thiếu cấu hình Supabase server. Vui lòng kiểm tra .env.local." },
        { status: 500 }
      );
    }

    const body = analyzeRequestSchema.parse(await request.json());
    const session = await requireAppSession();

    const admin = createAdminClient();
    const firstAnswer = body.answers[0]?.answer ?? "Dự án quảng cáo mới";

    const projectId =
      body.projectId ??
      (
        await admin
          .from("projects")
          .insert({
            user_id: session.userId,
            business_name: firstAnswer.slice(0, 120),
            industry: firstAnswer.slice(0, 120)
          })
          .select("id")
          .single()
      ).data?.id;

    if (!projectId) {
      throw new Error("Không thể tạo dự án trong Supabase.");
    }

    const sessionId =
      body.sessionId ??
      (
        await admin
          .from("question_sessions")
          .insert({
            user_id: session.userId,
            project_id: projectId,
            answers_json: body.answers,
            status: "analyzing"
          })
          .select("id")
          .single()
      ).data?.id;

    if (!sessionId) {
      throw new Error("Không thể lưu phiên câu hỏi.");
    }

    await admin
      .from("question_sessions")
      .update({
        answers_json: body.answers,
        status: "analyzing",
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", session.userId);

    const { output, raw } = await analyzeAdsPlanWithGemini(body.answers);

    await admin
      .from("projects")
      .update({
        industry: output.business_summary.industry || firstAnswer.slice(0, 120),
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId)
      .eq("user_id", session.userId);

    const { data: aiOutput, error: outputError } = await admin
      .from("ai_outputs")
      .insert({
        user_id: session.userId,
        project_id: projectId,
        session_id: sessionId,
        persona_json: output.customer_persona,
        ads_plan_json: output,
        raw_output: raw
      })
      .select("id")
      .single();

    if (outputError || !aiOutput?.id) {
      throw new Error(outputError?.message ?? "Không thể lưu kết quả AI.");
    }

    await admin
      .from("question_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", session.userId);

    return NextResponse.json({
      id: aiOutput.id,
      projectId,
      sessionId,
      output
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể phân tích kế hoạch.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
