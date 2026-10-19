import { notFound, redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { InterviewQuestion } from "@/lib/types";
import { PracticeSession } from "@/components/interview/practice-session";

export const metadata = { title: "单题练习" };

export default async function PracticePage({
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
  const { data: question } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("id", id)
    .single();
  if (!question) notFound();

  const q = question as InterviewQuestion;
  // 关联项目链接展示
  let linkedProject: { id: string; title: string } | null = null;
  if (q.linked_project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", q.linked_project_id)
      .single();
    linkedProject = project ?? null;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-foreground">
          {"// PRACTICE"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">单题练习</h1>
        <div className="divider-tactical mt-6" />
      </section>

      <PracticeSession question={q} linkedProject={linkedProject} />
    </div>
  );
}
