import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { Card } from "@/components/ui/card";
import { adsFeatureLinks } from "@/lib/ads-navigation";

export function AdsFeatureLauncher() {
  return (
    <Card className="rounded-lg p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Adplan AI</p>
          <h2 className="mt-1 text-xl font-extrabold text-on-surface">Tất cả tính năng Ads Facebook</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Sidebar chỉ giữ 2 khu chính cho gọn; toàn bộ module Adplan cũ nằm ở đây.
          </p>
        </div>
        <Link className="text-sm font-extrabold text-primary hover:underline" href="/facebook-publisher">
          Mở Publisher URL cũ
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {adsFeatureLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-outline-variant bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary transition group-hover:bg-primary group-hover:text-white">
              <MaterialIcon filled name={item.icon} />
            </div>
            <h3 className="text-sm font-extrabold text-on-surface">{item.label}</h3>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">{item.description}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
