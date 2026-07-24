import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { buildProjectText, syncSourceEmbeddings } from "@/lib/rag";
import type { Project, RecommendedProject } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/recommended/[id]/convert — 方案转为正式项目（仅管理员）
 * insert projects（planned + AI推荐 tag）→ 回填 converted_project_id + status=completed
 * 幂等：已转化过直接返回原 projectId
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: rec } = await supabase
    .from("recommended_projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!rec) {
    return NextResponse.json({ error: "推荐方案不存在" }, { status: 404 });
  }

  const recommendation = rec as RecommendedProject;
  if (recommendation.converted_project_id) {
    return NextResponse.json({ projectId: recommendation.converted_project_id });
  }

  const plan = recommendation.project_plan;
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title: plan.name,
      description: plan.description,
      tech_stack: plan.techStack ?? [],
      features: plan.features ?? [],
      tags: ["AI推荐"],
      status: "planned",
      readme_content: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `项目创建失败：${error.message}` }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("recommended_projects")
    .update({ converted_project_id: project.id, status: "completed" })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json(
      { error: `回填失败：${updateError.message}` },
      { status: 500 },
    );
  }

  // 同步 RAG 向量索引（无 start/end 日期，无需同步日历；失败不阻塞主流程）
  await syncSourceEmbeddings(
    "project",
    project.id,
    buildProjectText(project as Project),
  ).catch((e) => console.error("向量索引同步失败", e));

  return NextResponse.json({ projectId: project.id }, { status: 201 });
}
