import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type {
  InterviewQuestion,
  MockEvaluation,
  Resume,
} from "@/lib/types";
import { InterviewHome } from "@/components/interview/interview-home";

export const metadata = { title: "面试教练" };

export interface MockListItem {
  id: string;
  resume_id: string;
  evaluation: MockEvaluation | null;
  started_at: string;
  completed_at: string | null;
  target_role: string | null;
}

export default async function InterviewPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/interview");
  }

  const supabase = await createClient();
  const [{ data: resumes }, { data: questions }, { data: mocks }] =
    await Promise.all([
      supabase
        .from("resumes")
        .select("id, target_role, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_questions")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("mock_interviews")
        .select("id, resume_id, evaluation, started_at, completed_at")
        .order("started_at", { ascending: false }),
    ]);

  const resumeList = (resumes ?? []) as Pick<
    Resume,
    "id" | "target_role" | "created_at"
  >[];
  const roleById = new Map(resumeList.map((r) => [r.id, r.target_role]));

  const mockList: MockListItem[] = (mocks ?? []).map((m) => ({
    ...(m as Omit<MockListItem, "target_role">),
    target_role: roleById.get(m.resume_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// INTERVIEW COACH"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">AI 面试教练</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于目标岗位 JD 与项目经历生成面试题，单题练习 + 全流程模拟面试
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      <InterviewHome
        resumes={resumeList}
        initialQuestions={(questions ?? []) as InterviewQuestion[]}
        mockInterviews={mockList}
      />
    </div>
  );
}
