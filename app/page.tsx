import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { getAppSession } from "@/lib/auth/session";

const cards = [
  {
    href: "/workspace",
    title: "Workspace",
    description: "Quản lý và tổ chức công việc của bạn một cách khoa học và hiệu quả.",
    cta: "Vào Workspace",
    illustration: "workspace",
    points: [
      ["calendar_month", "Quản lý lịch và kế hoạch"],
      ["edit_square", "Tạo và quản lý bài viết"],
      ["bar_chart", "Thống kê hiệu suất"]
    ]
  },
  {
    href: "/ads-facebook",
    title: "Quản lý Facebook",
    description: "Kết nối và quản lý các trang Facebook của bạn tại một nơi duy nhất.",
    cta: "Vào Quản lý Facebook",
    illustration: "facebook",
    points: [
      ["group", "Kết nối và quản lý trang"],
      ["bar_chart", "Theo dõi hiệu suất trang"],
      ["groups", "Quản lý thành viên và vai trò"]
    ]
  }
];

export default async function HomePage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell contentClassName="px-6 pb-24 pt-28 md:px-10 md:pb-12 md:pt-32">
      <section className="mx-auto max-w-[1180px]">
        <div className="mb-9">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-slate-950 md:text-[34px]">
            Chào mừng bạn trở lại! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-3 text-[17px] font-medium text-slate-500">Hãy chọn một tính năng để bắt đầu công việc của bạn.</p>
        </div>

        <div className="grid justify-center gap-8 xl:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex min-h-[635px] flex-col rounded-2xl border border-[#e4ebf7] bg-white px-14 pb-12 pt-12 shadow-[0_22px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(37,99,235,0.14)]"
            >
              <div className="flex min-h-[250px] items-center justify-center">
                <LauncherIllustration type={card.illustration} />
              </div>

              <div className="mt-5">
                <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-slate-950">{card.title}</h2>
                <p className="mt-3 max-w-[390px] text-[16px] leading-7 text-slate-500">{card.description}</p>
              </div>

              <div className="my-8 h-px bg-slate-200" />

              <div className="grid gap-4">
                {card.points.map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
                    <MaterialIcon className="text-[20px] text-blue-600" name={icon} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-8">
                <div className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-blue-600 text-[16px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition group-hover:bg-blue-700">
                  {card.cta}
                  <MaterialIcon className="text-[20px]" name="arrow_forward" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function LauncherIllustration({ type }: { type: string }) {
  if (type === "facebook") {
    return (
      <div className="relative grid size-[210px] place-items-center">
        <div className="absolute inset-3 rounded-full border border-blue-100" />
        <div className="absolute inset-11 rounded-full bg-blue-50" />
        <div className="absolute left-1/2 top-2 grid size-12 -translate-x-1/2 place-items-center rounded-full bg-blue-50 text-blue-600 shadow-lg">
          <MaterialIcon filled name="thumb_up" />
        </div>
        <div className="absolute bottom-10 left-0 grid size-12 place-items-center rounded-full bg-orange-50 text-orange-500 shadow-lg">
          <MaterialIcon filled name="groups" />
        </div>
        <div className="absolute bottom-12 right-0 grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600 shadow-lg">
          <MaterialIcon filled name="chat_bubble" />
        </div>
        <div className="relative grid size-[108px] place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[74px] font-extrabold leading-none text-white shadow-[0_24px_60px_rgba(37,99,235,0.35)]">
          f
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid size-[220px] place-items-center">
      <div className="absolute inset-6 rounded-full bg-blue-50" />
      <div className="absolute top-[62px] h-20 w-28 rounded-2xl bg-blue-100 shadow-[0_18px_45px_rgba(37,99,235,0.18)]" />
      <div className="absolute top-[54px] h-24 w-32 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-[0_24px_58px_rgba(37,99,235,0.32)]" />
      <div className="absolute top-[42px] h-16 w-28 rounded-xl bg-white shadow-lg" />
      <div className="absolute top-[54px] h-3 w-16 rounded-full bg-blue-100" />
      <div className="absolute right-[62px] top-[42px] size-10 rounded-full bg-orange-400" />
      <div className="absolute bottom-[64px] h-16 w-36 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl" />
    </div>
  );
}
