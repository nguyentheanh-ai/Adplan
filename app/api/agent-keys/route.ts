import { NextResponse } from "next/server";
import { z } from "zod";
import { createAgentIngestKey, listAgentIngestKeysForUser, requireAgentKeyOwnerSession, sanitizeAgentKeyRecord } from "@/lib/agent-keys";

const createSchema = z.object({
  label: z.string().trim().min(1).max(80).default("Agent key"),
  permissions: z
    .object({
      canIngestDraft: z.boolean().optional(),
      canPublishDirect: z.boolean().optional(),
      canSchedule: z.boolean().optional()
    })
    .optional(),
  allowed_page_ids: z.array(z.string().trim()).optional(),
  daily_post_limit: z.number().int().min(1).max(100).nullable().optional(),
  allowed_window_json: z
    .object({
      startHour: z.number().int().min(0).max(23).nullable().optional(),
      endHour: z.number().int().min(0).max(23).nullable().optional()
    })
    .optional(),
  expires_at: z.string().trim().datetime().nullable().optional()
});

export async function GET() {
  try {
    const session = await requireAgentKeyOwnerSession();
    const keys = await listAgentIngestKeysForUser(session.userId);
    return NextResponse.json({ data: keys.map(sanitizeAgentKeyRecord) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được mã Agent." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAgentKeyOwnerSession();
    const body = createSchema.parse(await request.json().catch(() => ({})));
    const created = await createAgentIngestKey({
      userId: session.userId,
      label: body.label,
      permissions: body.permissions,
      allowedPageIds: body.allowed_page_ids,
      dailyPostLimit: body.daily_post_limit ?? null,
      allowedWindow: body.allowed_window_json ?? null,
      expiresAt: body.expires_at ?? null
    });

    return NextResponse.json({
      data: sanitizeAgentKeyRecord(created.record),
      raw_key: created.rawKey
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload tạo mã Agent không hợp lệ.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được mã Agent." }, { status: 400 });
  }
}
