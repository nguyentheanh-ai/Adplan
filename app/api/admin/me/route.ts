import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { getCurrentPermission } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const permission = await getCurrentPermission();
  return NextResponse.json({
    data: {
      user: {
        userId: session.userId,
        facebookId: session.facebookId,
        name: session.name
      },
      permission
    }
  });
}
