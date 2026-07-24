import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { normalizeProjectInput } from "@/lib/projects";
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
  return NextResponse.json({ project: data });
}

/** DELETE /api/projects/[id] — 删除项目（仅管理员） */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: `删除失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
