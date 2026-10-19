import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { isAdmin } from "@/lib/supabase/server";
import { ResumeNew } from "@/components/resume/resume-new";

export const metadata = { title: "智能简历" };

export default async function ResumePage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/resume");
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-foreground">
            {"// RESUME GENERATOR"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">智能简历生成器</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            粘贴目标岗位 JD，AI 分析岗位要求并从项目库匹配素材，生成针对性简历。
          </p>
        </div>
        <Link
          href="/resume/history"
          className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-chart-blue"
        >
          <History className="size-3.5" />
          历史版本
        </Link>
      </section>

      <div className="divider-tactical" />

      <ResumeNew />
    </div>
  );
}
