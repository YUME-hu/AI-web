import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { History } from "lucide-react";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { Project, Resume } from "@/lib/types";
import { ResumeWizard } from "@/components/resume/resume-wizard";

export const metadata = { title: "简历向导" };

export default async function ResumeWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();
  if (!resume) notFound();

  // 向导页需要全部已发布项目（匹配展示 + PDF 渲染）
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  const r = resume as Resume;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-primary">
            {"// RESUME WIZARD"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {r.target_role ?? "未命名岗位"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            创建于 {r.created_at.slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <Link
          href="/resume/history"
          className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <History className="size-3.5" />
          全部版本
        </Link>
      </section>

      <ResumeWizard resume={r} projects={(projects ?? []) as Project[]} />
    </div>
  );
}
