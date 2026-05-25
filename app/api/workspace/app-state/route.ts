import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const saveWorkspaceStateSchema = z.object({
  payload: z.record(z.string(), z.unknown())
});

function isMissingTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("app_state") || message.includes("schema cache");
}

export async function GET() {
  try {
    const session = await requireAppSession();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_state")
      .select("payload,updated_at")
      .eq("id", session.userId)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: "Chua co bang app_state cho Workspace." }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        user_id: session.userId,
        payload: data?.payload ?? null,
        updated_at: data?.updated_at ?? null
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ban can dang nhap." }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAppSession();
    const body = saveWorkspaceStateSchema.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_state")
      .upsert({
        id: session.userId,
        payload: body.payload,
        updated_at: new Date().toISOString()
      })
      .select("updated_at")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: "Chua co bang app_state cho Workspace." }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { updated_at: data.updated_at } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Workspace payload khong hop le.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong luu duoc Workspace." }, { status: 400 });
  }
}
