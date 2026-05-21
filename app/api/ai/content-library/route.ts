import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { adsContentInputSchema, adsContentPackageSchema } from "@/lib/ai-content-ads-shared";
import { createAdminClient } from "@/lib/supabase/admin";

const saveSchema = z.object({
  title: z.string().trim().min(2).optional(),
  input: adsContentInputSchema,
  content: adsContentPackageSchema
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("ads_content_library");
}

export async function GET() {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ads_content_library")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = saveSchema.parse(await request.json());
    const title = body.title || `${body.input.product} - ${new Date().toLocaleDateString("vi-VN")}`;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ads_content_library")
      .insert({
        user_id: session.userId,
        title,
        product: body.input.product,
        industry: body.input.industry || null,
        target_customer: body.input.targetCustomer || null,
        goal: body.input.goal,
        input_json: body.input,
        content_json: body.content,
        source: "creator_ads_ai"
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: "Chưa có bảng ads_content_library. Hãy chạy migration 202605210007_create_ads_content_library.sql." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu content.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
