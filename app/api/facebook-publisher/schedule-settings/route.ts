import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgentKeyOwnerSession } from "@/lib/agent-keys";
import { createAdminClient } from "@/lib/supabase/admin";

const defaultScheduleTimes = ["09:00", "14:00", "20:00"];

const scheduleSettingsSchema = z.object({
  page_id: z.string().trim().min(1),
  daily_post_count: z.number().int().min(1).max(10),
  schedule_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(10),
  active: z.boolean()
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("facebook_publisher_schedule_settings") || message.includes("schema cache");
}

function normalizeSettings(row?: {
  page_id?: string | null;
  daily_post_count?: number | null;
  schedule_times?: string[] | null;
  timezone?: string | null;
  active?: boolean | null;
} | null) {
  return {
    page_id: row?.page_id || "",
    daily_post_count: row?.daily_post_count || 3,
    schedule_times: row?.schedule_times?.length ? row.schedule_times : defaultScheduleTimes,
    timezone: row?.timezone || "Asia/Saigon",
    active: row?.active === true
  };
}

export async function GET() {
  try {
    const session = await requireAgentKeyOwnerSession();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("facebook_publisher_schedule_settings")
      .select("page_id,daily_post_count,schedule_times,timezone,active")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ data: normalizeSettings(), storage: "missing_schema" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: normalizeSettings(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bạn cần đăng nhập Facebook." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAgentKeyOwnerSession();
    const body = scheduleSettingsSchema.parse(await request.json());
    const scheduleTimes = body.schedule_times.slice(0, body.daily_post_count);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("facebook_publisher_schedule_settings")
      .upsert(
        {
          user_id: session.userId,
          page_id: body.page_id,
          daily_post_count: body.daily_post_count,
          schedule_times: scheduleTimes,
          timezone: "Asia/Saigon",
          active: body.active
        },
        { onConflict: "user_id" }
      )
      .select("page_id,daily_post_count,schedule_times,timezone,active")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: "Chưa có bảng facebook_publisher_schedule_settings. Hãy chạy migration schedule settings." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: normalizeSettings(data) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Cấu hình lịch không hợp lệ.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không lưu được lịch tự động." }, { status: 400 });
  }
}
