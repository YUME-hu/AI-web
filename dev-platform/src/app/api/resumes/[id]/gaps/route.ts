import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { PROJECT_PLAN } from "@/lib/prompts";
import {
  computeSkillGaps,
  normalizeProjectPlan,
  unionTechStack,
} from "@/lib/gaps";
import type { JdAnalysis, ProjectPlan, Resume } from "@/lib/types";

// 缺口技能取前 N 个生成方案（控制调用次数）
const MAX_GAP_PLANS = 4;

/**
 * POST /api/resumes/[id]/gaps — 技能缺口分析 + 项目方案生成（仅管理员）
 * body: { force?: boolean } — 为 true 时先删除该简历的既有推荐（重新生成）
 * 无缺口时返回空数组，不调用 AI
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
    .select("id, target_role, jd_analysis")
    .eq("id", id)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  // 重新生成：先删旧推荐
  if (body.force) {
    await supabase.from("recommended_projects").delete().eq("resume_id", id);
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("title, tech_stack");

  // 代码层确定性缺口计算（不调 AI）
  const jdAnalysis = (resume as Resume).jd_analysis as JdAnalysis | null;
  const gaps = computeSkillGaps(jdAnalysis, projects ?? []);
  if (gaps.length === 0) {
    return NextResponse.json({ gaps: [], recommendations: [] });
  }

  const top = gaps.slice(0, MAX_GAP_PLANS);
  const existingSkills = unionTechStack(projects ?? []);
  const targetRole =
    (resume as Resume).target_role ?? jdAnalysis?.title ?? "目标岗位";

  const recommendations = [];
  for (const gap of top) {
    try {
      const { data: raw } = await chatCompletionJson<ProjectPlan>(
        [
          { role: "system", content: PROJECT_PLAN.system },
          {
            role: "user",
            content: PROJECT_PLAN.user(gap.skill, existingSkills, targetRole),
          },
        ],
        { trackModule: "project_generator" },
      );
      const plan = normalizeProjectPlan(raw, gap.skill);
      const { data: row, error } = await supabase
        .from("recommended_projects")
        .insert({ resume_id: id, skill_gap: gap.skill, project_plan: plan })
        .select()
        .single();
      if (error) {
        return NextResponse.json(
          { error: `方案入库失败：${error.message}` },
          { status: 500 },
        );
      }
      recommendations.push(row);
    } catch (err) {
      if (err instanceof DeepSeekError) {
        return NextResponse.json(
          { error: `项目方案生成失败：${err.message}` },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: `生成「${gap.skill}」方案时出错，请重试` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ gaps, recommendations });
}
