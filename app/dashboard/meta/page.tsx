import { redirect } from "next/navigation";
import { getCurrentPermission } from "@/lib/admin/permissions";

export default async function DashboardMetaPage() {
  const permission = await getCurrentPermission();
  if (!permission || (permission.role !== "owner" && permission.role !== "manager")) {
    redirect("/ads-facebook");
  }

  redirect("/admin");
}
