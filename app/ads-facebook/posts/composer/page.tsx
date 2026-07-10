import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";

export default async function ComposerPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fads-facebook%2Fposts");
  redirect("/ads-facebook/posts");
}
