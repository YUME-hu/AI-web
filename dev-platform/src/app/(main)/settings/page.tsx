import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartColumn, ChevronRight, User, Wrench } from "lucide-react";
import { isAdmin } from "@/lib/supabase/server";

export const metadata = { title: "设置" };

const SECTIONS = [
  {
    href: "/settings/usage",
    icon: ChartColumn,
    title: "Token 监控",
    description: "AI 调用量、成本估算与当日限额",
    ready: true,
  },
  {
    href: null,
    icon: User,
    title: "个人信息",
    description: "简历头像、联系方式等个人资料",
    ready: false,
  },
  {
    href: null,
    icon: Wrench,
    title: "平台参数",
    description: "AI 模型与站点偏好设置",
    ready: false,
  },
];

export default async function SettingsPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/settings");
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// SETTINGS"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">设置</h1>
        <div className="divider-tactical mt-6" />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) =>
          section.href ? (
            <Link
              key={section.title}
              href={section.href}
              className="clip-corner group border border-border bg-card p-5 transition-colors hover:border-primary/60"
            >
              <section.icon className="size-5 text-primary" />
              <div className="mt-3 flex items-center gap-2">
                <h2 className="font-bold transition-colors group-hover:text-primary">
                  {section.title}
                </h2>
                <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
            </Link>
          ) : (
            <div
              key={section.title}
              className="border border-dashed border-border p-5"
            >
              <section.icon className="size-5 text-muted-foreground" />
              <h2 className="mt-3 font-bold text-muted-foreground">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                {"// Phase 9 接入"}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
