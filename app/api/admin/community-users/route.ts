import { NextResponse } from "next/server";
import { requireOwnerRole } from "@/lib/admin/permissions";
import { loadCommunityUsers } from "@/lib/community-users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOwnerRole();
    const result = await loadCommunityUsers();
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong the tai community users." }, { status: 403 });
  }
}
