import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";

/**
 * GET /api/interview/questions — 面试题筛选列表（仅管理员）
 * query: resume_id / category / difficulty / status，created_at 升序
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  let query = supabase
    .from("interview_questions")
    .select("*")
    .order("created_at", { ascending: true });

  const resumeId = sp.get("resume_id")?.trim();
  if (resumeId) query = query.eq("resume_id", resumeId);
  const category = sp.get("category")?.trim();
  if (category) query = query.eq("category", category);
  const difficulty = sp.get("difficulty")?.trim();
  if (difficulty && !Number.isNaN(Number(difficulty))) {
    query = query.eq("difficulty", Number(difficulty));
  }
  const status = sp.get("status")?.trim();
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ questions: data });
}
