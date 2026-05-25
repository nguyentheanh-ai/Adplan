import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { getAppSession } from "@/lib/auth/session";

const entries = [
  {
    href: "/workspace",
    eyebrow: "Workspace",
    title: "The Anh Marketing Growth Hub",
    description: "Mở thẳng khu app học viên/workspace đã copy từ app.theanhmarketing.com.",
    icon: "hub"
  },
  {
    href: "/ads",
    eyebrow: "Ads Facebook",
    title: "Adplan AI Operations",
    description: "Mở khu quản trị Ads/Facebook đang chạy trong Adplan AI.",
    icon: "campaign"
  }
];

export default async function HomePage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell title="Dashboard chung" description="Cổng vào 2 web đã gộp: Workspace và Ads Facebook. Không hiện module giả, không trải sitemap ra sidebar.">
      <div className="grid gap-5 lg:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group overflow-hidden rounded-[28px] border border-outline-variant bg-white p-7 shadow-[0_22px_70px_rgba(0,38,92,0.08)] transition hover:-translate-y-1 hover:border-primary hover:shadow-[0_28px_90px_rgba(0,76,202,0.16)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{entry.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-on-background">{entry.title}</h2>
              </div>
              <span className="grid size-14 place-items-center rounded-2xl bg-primary text-white transition group-hover:scale-105">
                <MaterialIcon filled name={entry.icon} />
              </span>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-on-surface-variant">{entry.description}</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white">
              Mở khu này
              <MaterialIcon className="text-[18px]" name="arrow_forward" />
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
