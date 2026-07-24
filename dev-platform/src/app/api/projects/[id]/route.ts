import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { normalizeProjectInput } from "@/lib/projects";
import { deleteProjectEvents, syncProjectEvents } from "@/lib/calendar";
import {
  buildProjectText,
  deleteSourceEmbeddings,
  syncSourceEmbeddings,
} from "@/lib/rag";
import type { Project, ProjectFormValues } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — 公开；未发布且非管理员返回 404 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  const project = data as Project | null;
  if (error || !project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  if (!project.is_published && !(await isAdmin())) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

/** PATCH /api/projects/[id] — 更新项目（仅管理员） */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<ProjectFormValues>;
  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "项目标题不能为空" }, { status: 400 });
  }

  const updates = {
    ...normalizeProjectInput(body),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失败：${error.message}` }, { status: 500 });
  }
  // 同步日历事件（失败不阻塞主流程）
  await syncProjectEvents(supabase, {
    id: data.id,
    title: data.title,
    start_date: data.start_date,
    end_date: data.end_date,
  }).catch((e) => console.error("日历事件同步失败", e));
  // 同步 RAG 向量索引（仅已发布项目可被检索，失败不阻塞主流程）
  if (data.is_published) {
    await syncSourceEmbeddings(
      "project",
      data.id,
      buildProjectText(data as Project),
    ).catch((e) => console.error("向量索引同步失败", e));
  } else {
    await deleteSourceEmbeddings("project", id).catch((e) =>
      console.error("向量索引删除失败", e),
    );
  }
  return NextResponse.json({ project: data });
}

/** DELETE /api/projects/[id] — 删除项目（仅管理员） */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  // 先删关联日历事件（FK 无 cascade，不删会导致项目删除报错）
  await deleteProjectEvents(supabase, id).catch((e) =>
    console.error("日历事件删除失败", e),
  );
  // 删除 RAG 向量索引（失败不阻塞主流程）
  await deleteSourceEmbeddings("project", id).catch((e) =>
    console.error("向量索引删除失败", e),
  );
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: `删除失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
