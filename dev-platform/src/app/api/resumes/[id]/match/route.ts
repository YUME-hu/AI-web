import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { PROJECT_MATCH } from "@/lib/prompts";
import { mergeGeneratedContent, normalizeMatches } from "@/lib/resumes";
import type { ProjectMatch, Resume } from "@/lib/types";

// 参与匹配的最大项目数（控制 token），超出时取最近更新的
const MAX_MATCH_PROJECTS = 20;

/**
 * POST /api/resumes/[id]/match — 对已发布项目进行岗位匹配评分（仅管理员）
 * 结果存 generated_content.matches 并返回
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  // 项目数 >20 时按 updated_at 取最近 20 个（控制 token）
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, tech_stack, features, highlights")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(MAX_MATCH_PROJECTS);

  if (!projects || projects.length === 0) {
    return NextResponse.json(
      { error: "暂无已发布项目，请先在项目库中创建项目" },
      { status: 400 },
    );
  }

  try {
    const { data: raw } = await chatCompletionJson<ProjectMatch[]>([
      { role: "system", content: PROJECT_MATCH.system },
      {
        role: "user",
        content: PROJECT_MATCH.user((resume as Resume).jd_analysis, projects),
      },
    ], { trackModule: "resume" });

    const matches = normalizeMatches(raw, new Set(projects.map((p) => p.id)));
    if (matches.length === 0) {
      return NextResponse.json(
        { error: "AI 未返回有效匹配结果，请重试" },
        { status: 502 },
      );
    }

    const generatedContent = mergeGeneratedContent(
      (resume as Resume).generated_content,
      { matches },
    );
    const { error } = await supabase
      .from("resumes")
      .update({ generated_content: generatedContent })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ matches });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json({ error: `项目匹配失败：${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "匹配服务异常，请稍后重试" }, { status: 500 });
  }
}
