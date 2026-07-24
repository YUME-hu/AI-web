import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/calendar/events/[id] — 仅允许删除 manual 类型（自动事件由源数据驱动） */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("calendar_events")
    .select("id, event_type")
    .eq("id", id)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "事件不存在" }, { status: 404 });
  }
  if (existing.event_type !== "manual") {
    return NextResponse.json(
      { error: "自动事件由源数据驱动，不能单独删除" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: `删除失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
