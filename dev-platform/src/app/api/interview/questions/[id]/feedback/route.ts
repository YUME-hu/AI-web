import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import { ANSWER_FEEDBACK } from "@/lib/prompts";
import { normalizeAnswerFeedback } from "@/lib/interview";
import type { AnswerFeedback, InterviewQuestion } from "@/lib/types";

const MAX_ANSWER_LENGTH = 3000;

/**
 * POST /api/interview/questions/[id]/feedback — 提交回答获取 AI 评估（仅管理员）
 * 存 ai_feedback + user_answer + status='practiced'
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const { answer } = (await request.json()) as { answer?: string };
  if (!answer?.trim()) {
    return NextResponse.json({ error: "回答不能为空" }, { status: 400 });
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json(
      { error: `回答不能超过 ${MAX_ANSWER_LENGTH} 字` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: question } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("id", id)
    .single();
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const q = question as InterviewQuestion;
  try {
    const { data: raw } = await chatCompletionJson<AnswerFeedback>(
      [
        { role: "system", content: ANSWER_FEEDBACK.system },
        {
          role: "user",
          content: ANSWER_FEEDBACK.user(
            q.question,
            q.assessment_points ?? [],
            answer.trim(),
          ),
        },
      ],
      { trackModule: "interview" },
    );
    const feedback = normalizeAnswerFeedback(raw);

    const { error } = await supabase
      .from("interview_questions")
      .update({
        ai_feedback: feedback,
        user_answer: answer.trim(),
        status: "practiced",
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ feedback });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `评估失败：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "评估服务异常，请稍后重试" }, { status: 500 });
  }
}
