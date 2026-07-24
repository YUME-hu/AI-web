import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { mergeGeneratedContent } from "@/lib/resumes";
import type {
  Resume,
  ResumeGeneratedContent,
  ResumeUserModifications,
} from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/resumes/[id] — 简历详情（仅管理员） */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }
  return NextResponse.json({ resume: data });
}

/**
 * PATCH /api/resumes/[id] — 更新选择 / 生成内容 / 用户修改差异（仅管理员）
 * body: { selectedProjectIds?, generatedContent?, userModifications? }
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    selectedProjectIds?: string[];
    generatedContent?: Partial<ResumeGeneratedContent>;
    userModifications?: ResumeUserModifications;
  };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("resumes")
    .select("id, generated_content")
    .eq("id", id)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.selectedProjectIds !== undefined) {
    if (!Array.isArray(body.selectedProjectIds)) {
      return NextResponse.json({ error: "selectedProjectIds 必须是数组" }, { status: 400 });
    }
    updates.selected_project_ids = body.selectedProjectIds;
  }
  if (body.generatedContent !== undefined) {
    // 与既有内容浅合并，避免覆盖其他字段
    updates.generated_content = mergeGeneratedContent(
      (existing as Resume).generated_content,
      body.generatedContent,
    );
  }
  if (body.userModifications !== undefined) {
    updates.user_modifications = body.userModifications;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("resumes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ resume: data });
}
