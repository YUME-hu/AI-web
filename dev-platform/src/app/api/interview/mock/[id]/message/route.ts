import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import {
  chatCompletion,
  chatCompletionJson,
  DeepSeekError,
  type ChatMessage,
} from "@/lib/deepseek";
import { INTERVIEW_EVALUATION, MOCK_INTERVIEW_SYSTEM } from "@/lib/prompts";
import {
  buildJdSummary,
  buildProjectsSummary,
  normalizeMockEvaluation,
} from "@/lib/interview";
import type {
  MockEvaluation,
  MockInterview,
  MockMessage,
  Resume,
} from "@/lib/types";

const MAX_MESSAGE_LENGTH = 2000;
/** 候选人消息达到该轮数后触发结束评估（面试共 8-10 轮） */
const FINAL_CANDIDATE_TURNS = 9;

/**
 * POST /api/interview/mock/[id]/message — 发送候选人回答（仅管理员）
 * 轮数判定：候选人消息数 ≥9 → 生成评估报告并结束（done: true）
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const { message } = (await request.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `消息不能超过 ${MAX_MESSAGE_LENGTH} 字` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: mock } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", id)
    .single();
  if (!mock) {
    return NextResponse.json({ error: "面试记录不存在" }, { status: 404 });
  }
  const interview = mock as MockInterview;
  if (interview.completed_at) {
    return NextResponse.json({ error: "面试已结束" }, { status: 400 });
  }

  // 重建 system prompt 需要岗位与项目摘要
  const [{ data: resume }, { data: projects }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, target_role, jd_analysis")
      .eq("id", interview.resume_id)
      .single(),
    supabase
      .from("projects")
      .select("id, title, description, tech_stack, features, highlights")
      .eq("is_published", true),
  ]);
  const system = MOCK_INTERVIEW_SYSTEM(
    buildJdSummary(
      (resume as Resume | null)?.jd_analysis ?? null,
      (resume as Resume | null)?.target_role ?? null,
    ),
    buildProjectsSummary(projects ?? []),
  );

  const conversation = interview.conversation ?? [];
  const candidateMsg: MockMessage = {
    role: "candidate",
    content: message.trim(),
    ts: new Date().toISOString(),
  };

  // 对话映射：interviewer→assistant，candidate→user
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...[...conversation, candidateMsg].map<ChatMessage>((m) => ({
      role: m.role === "interviewer" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  try {
    const result = await chatCompletion(messages, {
      trackModule: "interview",
    });
    const reply = result.content;
    const interviewerMsg: MockMessage = {
      role: "interviewer",
      content: reply,
      ts: new Date().toISOString(),
    };
    const newConversation = [...conversation, candidateMsg, interviewerMsg];

    // 先保存对话（评估失败也不丢本轮回复）
    const { error: saveError } = await supabase
      .from("mock_interviews")
      .update({ conversation: newConversation })
      .eq("id", id);
    if (saveError) {
      return NextResponse.json({ error: `保存失败：${saveError.message}` }, { status: 500 });
    }

    // 轮数判定：候选人消息数 ≥9 → 结束并生成评估报告
    const candidateTurns = newConversation.filter(
      (m) => m.role === "candidate",
    ).length;
    if (candidateTurns < FINAL_CANDIDATE_TURNS) {
      return NextResponse.json({ reply, done: false });
    }

    const { data: evalRaw } = await chatCompletionJson<MockEvaluation>(
      [
        { role: "system", content: INTERVIEW_EVALUATION.system },
        { role: "user", content: INTERVIEW_EVALUATION.user(newConversation) },
      ],
      { trackModule: "interview", maxTokens: 2000 },
    );
    const evaluation = normalizeMockEvaluation(evalRaw);
    const { error: evalSaveError } = await supabase
      .from("mock_interviews")
      .update({ evaluation, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (evalSaveError) {
      return NextResponse.json(
        { error: `评估保存失败：${evalSaveError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ reply, done: true, evaluation });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `面试服务异常：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "面试服务异常，请稍后重试" }, { status: 500 });
  }
}
