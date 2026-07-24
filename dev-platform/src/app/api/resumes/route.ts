import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { JD_ANALYSIS } from "@/lib/prompts";
import { normalizeJdAnalysis } from "@/lib/resumes";
import type { JdAnalysis } from "@/lib/types";

// JD 可能很长，截断以防止超出模型上下文
const MAX_JD_LENGTH = 20_000;

/** POST /api/resumes — 粘贴 JD 创建简历（JD 分析入库），返回 {id}（仅管理员） */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { jdContent, targetRole } = (await request.json()) as {
    jdContent?: string;
    targetRole?: string;
  };
  if (!jdContent?.trim() || !targetRole?.trim()) {
    return NextResponse.json(
      { error: "岗位描述与目标岗位均不能为空" },
      { status: 400 },
    );
  }

  try {
    const { data } = await chatCompletionJson<JdAnalysis>([
      { role: "system", content: JD_ANALYSIS.system },
      { role: "user", content: JD_ANALYSIS.user(jdContent.slice(0, MAX_JD_LENGTH)) },
    ]);
    const analysis = normalizeJdAnalysis(data);

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("resumes")
      .insert({
        jd_content: jdContent,
        target_role: targetRole.trim(),
        jd_analysis: analysis,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: `创建失败：${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json({ error: `JD 分析失败：${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "分析服务异常，请稍后重试" }, { status: 500 });
  }
}

/** GET /api/resumes — 简历版本列表（仅管理员） */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, target_role, created_at, selected_project_ids")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ resumes: data });
}
