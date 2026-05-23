import { NextResponse } from "next/server";
import { requireAgentKeyOwnerSession, revokeAgentIngestKey, sanitizeAgentKeyRecord } from "@/lib/agent-keys";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAgentKeyOwnerSession();
    const { id } = await context.params;
    const data = await revokeAgentIngestKey({ id, userId: session.userId });
    if (!data) {
      return NextResponse.json({ error: "Không tìm thấy mã Agent cần thu hồi." }, { status: 404 });
    }
    return NextResponse.json({ data: sanitizeAgentKeyRecord(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thu hồi được mã Agent." }, { status: 400 });
  }
}
