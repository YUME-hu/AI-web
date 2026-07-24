import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartColumn, ChevronRight, User, Wrench } from "lucide-react";
import { isAdmin } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "设置" };

export default async function SettingsPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/settings");
  }

  const profile = await getProfile();

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// SETTINGS"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">设置</h1>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 个人信息（首页 Hero 数据来源） */}
      <section className="clip-corner border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          <User className="size-4" />
          个人信息
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          展示在首页 Hero 区与简历默认信息中
        </p>
        <ProfileForm profile={profile} />
      </section>

      {/* 其他设置入口 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/settings/usage"
          className="clip-corner group border border-border bg-card p-5 transition-colors hover:border-primary/60"
        >
          <ChartColumn className="size-5 text-primary" />
          <div className="mt-3 flex items-center gap-2">
            <h2 className="font-bold transition-colors group-hover:text-primary">
              Token 监控
            </h2>
            <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 调用量、成本估算与当日限额
          </p>
        </Link>

        <div className="border border-dashed border-border p-5">
          <Wrench className="size-5 text-muted-foreground" />
          <h2 className="mt-3 font-bold text-muted-foreground">平台参数</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 模型与站点偏好设置
          </p>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            {"// 后续阶段接入"}
          </p>
        </div>
      </div>
    </div>
  );
}
