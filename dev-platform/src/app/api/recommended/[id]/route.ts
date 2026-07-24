import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { RecommendedStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES: RecommendedStatus[] = ["saved", "started", "completed"];

/** PATCH /api/recommended/[id] — 更新状态（仅管理员），body {status} 校验枚举 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  if (!body.status || !VALID_STATUSES.includes(body.status as RecommendedStatus)) {
    return NextResponse.json(
      { error: "status 必须是 saved / started / completed 之一" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommended_projects")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ recommendation: data });
}
