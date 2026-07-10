import { redirect } from "next/navigation";

export default function RemovedAdminPage() {
  redirect("/settings");
}
