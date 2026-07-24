import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/supabase/server";
import { getUsageStats } from "@/lib/usage";

/** GET /api/usage — AI 用量统计（仅管理员） */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  try {
    const stats = await getUsageStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: `统计查询失败：${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
