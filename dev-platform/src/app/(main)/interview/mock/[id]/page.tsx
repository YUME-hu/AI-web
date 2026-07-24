import { notFound, redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { MockInterview } from "@/lib/types";
import { MockSession } from "@/components/interview/mock-session";

export const metadata = { title: "模拟面试" };

export default async function MockInterviewPage({
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
  const { data: interview } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", id)
    .single();
  if (!interview) notFound();

  const { data: resume } = await supabase
    .from("resumes")
    .select("target_role")
    .eq("id", (interview as MockInterview).resume_id)
    .single();

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// MOCK INTERVIEW"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          模拟面试 · {resume?.target_role ?? "未命名岗位"}
        </h1>
        <div className="divider-tactical mt-6" />
      </section>

      <MockSession interview={interview as MockInterview} />
    </div>
  );
}
