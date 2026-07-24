import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { InterviewQuestionStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES: InterviewQuestionStatus[] = ["new", "practiced", "mastered"];
const MAX_ANSWER_LENGTH = 3000;

/** PATCH /api/interview/questions/[id] — 更新状态 / 回答草稿（仅管理员） */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    user_answer?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as InterviewQuestionStatus)) {
      return NextResponse.json(
        { error: "status 必须是 new / practiced / mastered 之一" },
        { status: 400 },
      );
    }
    updates.status = body.status;
  }
  if (body.user_answer !== undefined) {
    if (body.user_answer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json(
        { error: `回答不能超过 ${MAX_ANSWER_LENGTH} 字` },
        { status: 400 },
      );
    }
    updates.user_answer = body.user_answer;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_questions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `更新失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ question: data });
}
