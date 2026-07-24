import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { RecommendedProject, Resume } from "@/lib/types";

/**
 * GET /api/recommended?resume_id=xxx — 推荐方案列表（仅管理员）
 * 附带 resume.target_role 展示用；resumes 字段供筛选下拉（全部有推荐的简历）
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const supabase = await createClient();
  const resumeId = request.nextUrl.searchParams.get("resume_id");

  let query = supabase
    .from("recommended_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (resumeId) {
    query = query.eq("resume_id", resumeId);
  }

  // 筛选下拉需要全量（不受 resume_id 过滤影响），单独取 distinct resume_id
  const [{ data: recs, error }, { data: allRecs }] = await Promise.all([
    query,
    supabase.from("recommended_projects").select("resume_id"),
  ]);
  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }

  const list = (recs ?? []) as RecommendedProject[];
  const allResumeIds = [
    ...new Set((allRecs ?? []).map((r) => r.resume_id as string)),
  ];

  const { data: resumes } = allResumeIds.length
    ? await supabase
        .from("resumes")
        .select("id, target_role, created_at")
        .in("id", allResumeIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const roleById = new Map(
    ((resumes ?? []) as Pick<Resume, "id" | "target_role">[]).map((r) => [
      r.id,
      r.target_role,
    ]),
  );

  return NextResponse.json({
    recommendations: list.map((r) => ({
      ...r,
      target_role: roleById.get(r.resume_id) ?? null,
    })),
    resumes: (resumes ?? []).map((r) => ({
      id: r.id,
      target_role: r.target_role,
      created_at: r.created_at,
    })),
  });
}
