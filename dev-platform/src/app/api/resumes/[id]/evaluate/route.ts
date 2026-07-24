import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { RESUME_EVALUATE } from "@/lib/prompts";
import { normalizeEvaluations } from "@/lib/resumes";
import type { Resume, ResumeEvaluation } from "@/lib/types";

interface EvaluateItem {
  projectId: string;
  title: string;
  description: string;
}

/**
 * POST /api/resumes/[id]/evaluate — 对当前勾选项目的最终描述进行 AI 自评（仅管理员）
 * body: { items: [{ projectId, title, description }] }，结果存 ai_evaluation 并返回
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const { items } = (await request.json()) as { items?: EvaluateItem[] };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "请先勾选要评估的项目" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("id, jd_analysis")
    .eq("id", id)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  // 岗位摘要：岗位名称 + 经验要求 + 高优先级技能
  const analysis = (resume as Resume).jd_analysis;
  const topSkills = (analysis?.requiredSkills ?? [])
    .filter((s) => s.importance === "high")
    .map((s) => s.skill)
    .join("、");
  const jobSummary = `${analysis?.title ?? "目标岗位"}（经验要求：${analysis?.requiredExperience ?? "未知"}），核心技能：${topSkills || "见岗位描述"}`;

  const descriptions = items.map((item) => ({
    projectId: item.projectId,
    title: item.title,
    description: item.description,
  }));

  try {
    const { data: raw } = await chatCompletionJson<ResumeEvaluation[]>([
      { role: "system", content: RESUME_EVALUATE.system },
      { role: "user", content: RESUME_EVALUATE.user(jobSummary, descriptions) },
    ], { trackModule: "resume" });

    const evaluation = normalizeEvaluations(raw);
    const { error } = await supabase
      .from("resumes")
      .update({ ai_evaluation: evaluation })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ evaluation });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json({ error: `AI 自评失败：${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "评估服务异常，请稍后重试" }, { status: 500 });
  }
}
