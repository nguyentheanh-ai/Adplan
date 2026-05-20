import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { generateCampaignCode } from "@/lib/campaign-builder";
import { createAdminClient } from "@/lib/supabase/admin";

const sequenceSchema = z.object({
  account_id: z.string().trim().min(3)
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("campaign_sequences") || message.includes("schema cache");
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  const body = sequenceSchema.parse(await request.json());
  const admin = createAdminClient();

  const { data: rows, error: readError } = await admin
    .from("campaign_sequences")
    .select("id,payload,created_at")
    .eq("user_id", session.userId)
    .eq("account_id", body.account_id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (readError) {
    if (isMissingTable(readError)) {
      const sequence = Number(new Date().toISOString().slice(-5, -3)) || 0;
      return NextResponse.json({ storage: "local", sequence, code: generateCampaignCode(body.account_id, sequence) });
    }
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const previousMax = (rows ?? []).reduce((max, row) => {
    const value = Number((row.payload as { sequence?: unknown } | null)?.sequence);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1);
  const sequence = Math.max(previousMax + 1, rows?.length ?? 0);
  const code = generateCampaignCode(body.account_id, sequence);

  const { error: insertError } = await admin.from("campaign_sequences").insert({
    user_id: session.userId,
    account_id: body.account_id,
    name: code,
    mode: "new_campaign",
    payload: { sequence, code, account_id: body.account_id }
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ sequence, code });
}
