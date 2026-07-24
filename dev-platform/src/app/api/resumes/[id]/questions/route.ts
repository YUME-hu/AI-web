import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { INTERVIEW_QUESTIONS } from "@/lib/prompts";
import {
  buildProjectsSummary,
  normalizeInterviewQuestions,
} from "@/lib/interview";
import type { Resume } from "@/lib/types";

/**
 * POST /api/resumes/[id]/questions — 生成面试题（仅管理员）
 * 已有题目时：body {force:true} 先删旧题重新生成，否则返回 409 + 已有数量
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };

  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("id, jd_analysis")
    .eq("id", id)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }
  if (!(resume as Resume).jd_analysis) {
    return NextResponse.json(
      { error: "该简历缺少 JD 分析数据，无法生成面试题" },
      { status: 400 },
    );
  }

  // 已有题目检查
  const { count } = await supabase
    .from("interview_questions")
    .select("id", { count: "exact", head: true })
    .eq("resume_id", id);
  const existing = count ?? 0;
  if (existing > 0 && !body.force) {
    return NextResponse.json(
      { error: "该岗位已有面试题", count: existing },
      { status: 409 },
    );
  }
  if (existing > 0 && body.force) {
    await supabase.from("interview_questions").delete().eq("resume_id", id);
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, tech_stack, features, highlights")
    .eq("is_published", true);

  try {
    const { data: raw } = await chatCompletionJson<unknown[]>(
      [
        { role: "system", content: INTERVIEW_QUESTIONS.system },
        {
          role: "user",
          content: INTERVIEW_QUESTIONS.user(
            (resume as Resume).jd_analysis,
            buildProjectsSummary(projects ?? []),
          ),
        },
      ],
      // 15 道题含参考答案较长，放大 token 上限
      { trackModule: "interview", maxTokens: 6000 },
    );

    const validProjectIds = new Set((projects ?? []).map((p) => p.id as string));
    const questions = normalizeInterviewQuestions(raw, validProjectIds);
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "AI 未返回有效题目，请重试" },
        { status: 502 },
      );
    }

    const { error } = await supabase
      .from("interview_questions")
      .insert(questions.map((q) => ({ ...q, resume_id: id })));
    if (error) {
      return NextResponse.json({ error: `入库失败：${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ count: questions.length }, { status: 201 });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `面试题生成失败：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "生成服务异常，请稍后重试" }, { status: 500 });
  }
}
