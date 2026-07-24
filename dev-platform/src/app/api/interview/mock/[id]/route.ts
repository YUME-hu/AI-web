import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/interview/mock/[id] — 完整面试记录（仅管理员） */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "面试记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ interview: data });
}
