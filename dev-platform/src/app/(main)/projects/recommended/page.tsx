import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { RecommendedProject, Resume } from "@/lib/types";
import { RecommendedList } from "@/components/projects/recommended-list";

export const metadata = { title: "推荐项目方案" };

export default async function RecommendedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ resume_id?: string }>;
}) {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/projects/recommended");
  }
  const { resume_id } = await searchParams;

  const supabase = await createClient();
  const { data: recs } = await supabase
    .from("recommended_projects")
    .select("*")
    .order("created_at", { ascending: false });
  const recommendations = (recs ?? []) as RecommendedProject[];

  // 筛选下拉 + 卡片上的岗位标签（手动 join）
  const resumeIds = [...new Set(recommendations.map((r) => r.resume_id))];
  const { data: resumes } = resumeIds.length
    ? await supabase
        .from("resumes")
        .select("id, target_role, created_at")
        .in("id", resumeIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const resumeList = (resumes ?? []) as Pick<
    Resume,
    "id" | "target_role" | "created_at"
  >[];
  const roleById = new Map(resumeList.map((r) => [r.id, r.target_role]));

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// PROJECT GENERATOR"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">推荐项目方案</h1>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 说明卡 */}
      <section className="clip-corner border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm text-foreground/90">
          这里展示 AI 根据<span className="text-primary">技能缺口分析</span>
          生成的练习项目方案：对照目标岗位 JD 的技能要求与项目库现有技术栈，
          找出缺失或覆盖不足的技能，并推荐可补齐缺口的项目。
        </p>
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          发起入口：简历生成 → 向导第 2 步「项目匹配」→「分析技能缺口」
        </p>
      </section>

      <RecommendedList
        initialRecommendations={recommendations.map((r) => ({
          ...r,
          target_role: roleById.get(r.resume_id) ?? null,
        }))}
        resumes={resumeList}
        initialResumeId={resume_id ?? ""}
      />
    </div>
  );
}
