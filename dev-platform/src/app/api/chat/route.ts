import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  chatCompletionStream,
  DeepSeekError,
  type ChatMessage,
} from "@/lib/deepseek";
import { EmbeddingError } from "@/lib/embedding";
import { retrieve, type RetrievedChunk } from "@/lib/rag";
import { RAG_CHAT_SYSTEM } from "@/lib/prompts";
import type { RagSource } from "@/lib/types";

const MAX_MESSAGE_LENGTH = 500;
const MAX_SESSION_ID_LENGTH = 64;
const HISTORY_LIMIT = 10;

type ServiceClient = ReturnType<typeof createServiceClient>;

/** 检索块 → 来源链接（按来源去重）+ 每块的标题查找表 */
async function resolveSources(
  supabase: ServiceClient,
  chunks: RetrievedChunk[],
): Promise<{ sources: RagSource[]; titleOf: (chunk: RetrievedChunk) => string }> {
  const projectIds = [
    ...new Set(chunks.filter((c) => c.source_type === "project").map((c) => c.source_id)),
  ];
  const blogIds = [
    ...new Set(chunks.filter((c) => c.source_type === "blog").map((c) => c.source_id)),
  ];

  const [{ data: projects }, { data: posts }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] }),
    blogIds.length
      ? supabase
          .from("blog_posts")
          .select("id, title, slug")
          .in("id", blogIds)
          .eq("is_published", true)
      : Promise.resolve({ data: [] }),
  ]);

  // key: `${type}:${id}` → 来源
  const sourceByKey = new Map<string, RagSource>();
  for (const p of projects ?? []) {
    sourceByKey.set(`project:${p.id}`, {
      type: "project",
      title: p.title,
      url: `/projects/${p.id}`,
    });
  }
  for (const p of posts ?? []) {
    sourceByKey.set(`blog:${p.id}`, {
      type: "blog",
      title: p.title,
      url: `/blog/${p.slug}`,
    });
  }

  const sources: RagSource[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const key = `${chunk.source_type}:${chunk.source_id}`;
    const source = sourceByKey.get(key);
    if (source && !seen.has(key)) {
      seen.add(key);
      sources.push(source);
    }
  }

  return {
    sources,
    titleOf: (chunk) =>
      sourceByKey.get(`${chunk.source_type}:${chunk.source_id}`)?.title ?? "未命名来源",
  };
}

/**
 * POST /api/chat — 公开 RAG 对话（SSE 流式）
 * 协议：首帧 sources → 若干 delta 帧 → done 帧；流中途出错发 error 帧
 * 前置失败（Embedding/检索）→ 502 JSON 中文错误
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    message?: string;
  } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH) {
    return NextResponse.json({ error: "sessionId 不合法" }, { status: 400 });
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `消息不能为空且不超过 ${MAX_MESSAGE_LENGTH} 字` },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient();

    // 1. 会话历史（最近 10 条，升序喂给模型）
    const { data: history } = await supabase
      .from("chat_sessions")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    const historyMessages: ChatMessage[] = (history ?? [])
      .reverse()
      .filter((h) => h.role === "user" || h.role === "assistant")
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    // 2. 检索上下文
    const chunks = await retrieve(message, 5, 0.35);
    const { sources, titleOf } = await resolveSources(supabase, chunks);

    // 3. 组装 messages
    const contextText = chunks.length
      ? chunks
          .map((c, i) => `【资料${i + 1} · 来源：${titleOf(c)}】\n${c.chunk_text}`)
          .join("\n\n")
      : "（未检索到相关资料）";
    const messages: ChatMessage[] = [
      { role: "system", content: `${RAG_CHAT_SYSTEM}\n\n检索资料：\n${contextText}` },
      ...historyMessages,
      { role: "user", content: message },
    ];

    // 4. 包装 SSE：sources 帧 → delta 帧 → done 帧
    const deepseekStream = chatCompletionStream(messages, { maxTokens: 1500 });
    const encoder = new TextEncoder();
    let fullAnswer = "";

    const sse = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          send({ type: "sources", sources });
          const reader = deepseekStream.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            fullAnswer += value;
            send({ type: "delta", text: value });
          }
          send({ type: "done" });
          controller.close();

          // 5. 完整回答收集后落库（先 user 后 assistant 保证时序；失败仅日志）
          const { error: userWriteError } = await supabase
            .from("chat_sessions")
            .insert({ session_id: sessionId, role: "user", content: message });
          if (userWriteError) console.error("聊天记录写入失败", userWriteError);
          const { error: assistantWriteError } = await supabase
            .from("chat_sessions")
            .insert({
              session_id: sessionId,
              role: "assistant",
              content: fullAnswer,
              sources,
            });
          if (assistantWriteError) console.error("聊天记录写入失败", assistantWriteError);
        } catch (err) {
          // 流中途出错：协议内 error 帧（响应头已发出，无法再返回 502）
          console.error("对话流异常", err);
          try {
            send({ type: "error", error: "AI 服务异常，请稍后重试" });
            controller.close();
          } catch {
            // 流已被取消，忽略
          }
        }
      },
    });

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof EmbeddingError || err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `AI 服务异常：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "服务异常，请稍后重试" }, { status: 500 });
  }
}
