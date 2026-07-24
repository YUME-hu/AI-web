import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";

/**
 * GET /api/calendar/events — 公开（RLS：SELECT 公开）
 * query: from / to（YYYY-MM-DD 日期范围），按 date 升序
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  let query = supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: true });

  const from = sp.get("from")?.trim();
  if (from) {
    query = query.gte("date", from);
  }
  const to = sp.get("to")?.trim();
  if (to) {
    query = query.lte("date", to);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ events: data });
}

/** POST /api/calendar/events — 手动记录（仅管理员），event_type 固定 manual */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: string;
    title?: string;
    description?: string;
    linked_project_id?: string;
  };
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json(
      { error: "日期格式应为 YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      date: body.date,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      linked_project_id: body.linked_project_id || null,
      event_type: "manual",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `创建失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ event: data }, { status: 201 });
}
