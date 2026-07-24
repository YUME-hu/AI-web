import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { normalizeProjectInput, queryProjects } from "@/lib/projects";
import { syncProjectEvents } from "@/lib/calendar";
import type { ProjectFormValues } from "@/lib/types";

/**
 * GET /api/projects — 公开
 * query: q（标题/简介模糊）、tech（技术栈包含）、tag、status、from/to（start_date 范围）
 * 未登录只返回 is_published=true
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin = await isAdmin();
  const sp = request.nextUrl.searchParams;

  const { projects, error } = await queryProjects(
    supabase,
    {
      q: sp.get("q") ?? undefined,
      tech: sp.get("tech") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      status: sp.get("status") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    },
    !admin,
  );

  if (error) {
    return NextResponse.json({ error: `查询失败：${error}` }, { status: 500 });
  }
  return NextResponse.json({ projects });
}

/** POST /api/projects — 创建项目（仅管理员） */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ProjectFormValues>;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "项目标题不能为空" }, { status: 400 });
  }

  const row = {
    // 新建时补全默认值（normalizeProjectInput 只保留出现的字段）
    tech_stack: [],
    tags: [],
    features: [],
    highlights: [],
    status: "completed",
    is_published: true,
    ...normalizeProjectInput(body),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `创建失败：${error.message}` }, { status: 500 });
  }
  // 同步日历事件（失败不阻塞主流程）
  await syncProjectEvents(supabase, {
    id: data.id,
    title: data.title,
    start_date: data.start_date,
    end_date: data.end_date,
  }).catch((e) => console.error("日历事件同步失败", e));
  return NextResponse.json({ project: data }, { status: 201 });
}
