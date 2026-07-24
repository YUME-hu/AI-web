import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletion, DeepSeekError } from "@/lib/deepseek";
import { MOCK_INTERVIEW_SYSTEM } from "@/lib/prompts";
import { buildJdSummary, buildProjectsSummary } from "@/lib/interview";
import type { MockMessage, Resume } from "@/lib/types";

/**
 * POST /api/interview/mock — 创建模拟面试（仅管理员）
 * 建记录 → AI 生成开场白写入 conversation → 返回 {id, opening}
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { resumeId } = (await request.json()) as { resumeId?: string };
  if (!resumeId) {
    return NextResponse.json({ error: "resumeId 不能为空" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("id, target_role, jd_analysis")
    .eq("id", resumeId)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, tech_stack, features, highlights")
    .eq("is_published", true);

  const system = MOCK_INTERVIEW_SYSTEM(
    buildJdSummary((resume as Resume).jd_analysis, (resume as Resume).target_role),
    buildProjectsSummary(projects ?? []),
  );

  const { data: mock, error } = await supabase
    .from("mock_interviews")
    .insert({ resume_id: resumeId, conversation: [] })
    .select("id")
    .single();
  if (error || !mock) {
    return NextResponse.json(
      { error: `创建失败：${error?.message ?? "未知错误"}` },
      { status: 500 },
    );
  }

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: "请开始面试" },
      ],
      { trackModule: "interview" },
    );
    const opening = result.content;
    const conversation: MockMessage[] = [
      { role: "interviewer", content: opening, ts: new Date().toISOString() },
    ];
    const { error: updateError } = await supabase
      .from("mock_interviews")
      .update({ conversation })
      .eq("id", mock.id);
    if (updateError) {
      return NextResponse.json(
        { error: `保存失败：${updateError.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ id: mock.id, opening }, { status: 201 });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `面试发起失败：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "面试服务异常，请稍后重试" }, { status: 500 });
  }
}

/** GET /api/interview/mock?resume_id= — 历史列表（仅管理员，含 evaluation 摘要） */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("mock_interviews")
    .select("id, resume_id, evaluation, started_at, completed_at")
    .order("started_at", { ascending: false });
  const resumeId = request.nextUrl.searchParams.get("resume_id");
  if (resumeId) {
    query = query.eq("resume_id", resumeId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }

  // 关联目标岗位展示用（手动 join）
  const resumeIds = [...new Set((data ?? []).map((m) => m.resume_id as string))];
  const { data: resumes } = resumeIds.length
    ? await supabase.from("resumes").select("id, target_role").in("id", resumeIds)
    : { data: [] };
  const roleById = new Map((resumes ?? []).map((r) => [r.id, r.target_role]));

  return NextResponse.json({
    interviews: (data ?? []).map((m) => ({
      ...m,
      target_role: roleById.get(m.resume_id) ?? null,
    })),
  });
}
