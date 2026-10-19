"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MessageSquarePlus,
  RotateCcw,
  Search,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import type { RagSource, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** ISO 时间戳，用于 [SYS_LOG // hh:mm:ss] 标签 */
  ts: string;
  sources?: RagSource[];
}

const EXAMPLE_QUESTIONS = [
  "你做过哪些 React 项目？",
  "平台主人擅长哪些技术栈？",
  "有没有关于 Next.js 的文章？",
];

const SESSION_KEY = "chat-session-id";

/** 相似度分色（《星空》辅助色板，不用警示红） */
function similarityClass(similarity: number): string {
  if (similarity > 0.6) return "text-chart-blue";
  if (similarity >= 0.4) return "text-chart-orange";
  return "text-muted-foreground";
}

/** ISO → 本地 hh:mm:ss（终端日志戳） */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function ChatInterface() {
  const [mode, setMode] = useState<"chat" | "search">("chat");

  // ---- 对话状态 ----
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // sessionId 只需在发送时读取，用 ref 惰性初始化（避免 SSR/水合不一致）
  const sessionIdRef = useRef<string | null>(null);

  // ---- 搜索状态 ----
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 新内容时滚动到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function getSessionId(): string {
    if (!sessionIdRef.current) {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        sessionIdRef.current = saved;
      } else {
        const id = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, id);
        sessionIdRef.current = id;
      }
    }
    return sessionIdRef.current;
  }

  function updateMessage(id: string, fn: (m: ChatMessage) => ChatMessage) {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }

  function newSession() {
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    sessionIdRef.current = id;
    setMessages([]);
    setError(null);
  }

  /** 发送消息并按行解析 SSE 流 */
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const sessionId = getSessionId();
    setInput("");
    setError(null);

    const aiId = crypto.randomUUID();
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, ts: now },
      { id: aiId, role: "assistant", content: "", sources: [], ts: now },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "请求失败，请重试");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          try {
            const json = JSON.parse(trimmedLine.slice(5).trim());
            if (json.type === "sources") {
              updateMessage(aiId, (m) => ({ ...m, sources: json.sources }));
            } else if (json.type === "delta") {
              updateMessage(aiId, (m) => ({ ...m, content: m.content + json.text }));
            } else if (json.type === "error") {
              setError(json.error ?? "AI 服务异常");
            }
            // done 帧无需处理，流自然结束
          } catch {
            // 忽略不完整的 JSON 行
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请重试");
      // 移除未产出内容的 AI 占位消息
      setMessages((prev) => prev.filter((m) => m.id !== aiId || m.content));
    } finally {
      setStreaming(false);
    }
  }

  async function runSearch() {
    const q = searchQuery.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "搜索失败，请重试");
      }
      setResults(data.results as SearchResult[]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "搜索失败，请重试");
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="term-panel border border-foreground">
      {/* 模式切换：终端命令式 */}
      <div className="term-rule flex items-center border-b">
        {(
          [
            { key: "chat", label: "AI 问答", icon: Sparkles },
            { key: "search", label: "语义搜索", icon: Search },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-none",
              mode === tab.key
                ? "bg-[#ECE5D6] text-[#191919]"
                : "text-[#ECE5D6]/55 hover:text-[#ECE5D6]",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
        {mode === "chat" && (
          <button
            onClick={newSession}
            className="ml-auto mr-3 flex items-center gap-1.5 border border-[#ECE5D6]/35 px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-[#ECE5D6]/70 uppercase transition-none hover:border-[#ECE5D6] hover:bg-[#ECE5D6] hover:text-[#191919]"
          >
            <RotateCcw className="size-3" />
            新会话
          </button>
        )}
      </div>

      {mode === "chat" ? (
        <>
          {/* 消息流：无气泡，靠 1px 细线分割 */}
          <div
            ref={listRef}
            className="h-[52vh] overflow-y-auto bg-[#101010]"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <MessageSquarePlus className="size-8 text-[#ECE5D6]/35" />
                <p className="mt-4 font-mono text-sm tracking-[0.1em] text-[#ECE5D6] uppercase">
                  {"// READY FOR INPUT"}
                </p>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-[#ECE5D6]/50">
                  知识库 = 项目库 + 博客文章。可用指令示例：
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="border border-[#ECE5D6]/25 px-2.5 py-1.5 font-mono text-[11px] text-[#ECE5D6]/70 transition-none hover:border-[#ECE5D6] hover:text-[#ECE5D6]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className="term-rule border-b px-4 py-3.5 md:px-5">
                    {/* 日志标签 */}
                    <p className="font-mono text-[10px] tracking-[0.16em] uppercase">
                      <span className="text-[#ECE5D6]/45">
                        [{isUser ? "INPUT" : "SYS_LOG"} {"//"}{" "}
                        <span suppressHydrationWarning>{stamp(m.ts)}</span>]
                      </span>
                    </p>

                    {isUser ? (
                      <div className="mt-1.5 flex gap-2">
                        <span className="shrink-0 font-mono text-xs leading-relaxed text-primary">
                          {">_"}
                        </span>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#ECE5D6]">
                          {m.content}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1.5">
                        {m.content === "" && streaming && isLast ? (
                          <span className="term-blink font-mono text-[11px] tracking-[0.14em] text-[#ECE5D6]/65">
                            [ LOADING... ]
                          </span>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#ECE5D6]">
                            {m.content}
                            {streaming && isLast && m.content !== "" && (
                              <span className="term-blink ml-1 inline-block h-3.5 w-1.5 translate-y-[2px] bg-primary align-baseline" />
                            )}
                          </p>
                        )}

                        {/* 来源 chips */}
                        {m.sources && m.sources.length > 0 && (
                          <div className="term-rule mt-2.5 flex flex-wrap gap-1.5 border-t pt-2">
                            {m.sources.map((s) => (
                              <Link
                                key={s.url}
                                href={s.url}
                                className="flex items-center gap-1 border border-[#ECE5D6]/25 px-1.5 py-0.5 font-mono text-[10px] text-[#ECE5D6]/60 transition-none hover:border-[#ECE5D6] hover:text-[#ECE5D6]"
                              >
                                <ExternalLink className="size-2.5" />
                                {s.type === "project" ? "项目" : "文章"} · {s.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <p className="term-rule mx-4 mt-2 border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs text-[#ECE5D6] md:mx-5">
              {">_ "}
              {error}
            </p>
          )}

          {/* 输入区 */}
          <div className="term-rule border-t p-3 md:px-5">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter 发送，Shift+Enter 换行
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                rows={2}
                maxLength={500}
                disabled={streaming}
                className="np-input np-textarea np-input-term flex-1 resize-none text-sm disabled:opacity-60"
              />
              <Button
                onClick={() => void send(input)}
                disabled={streaming || !input.trim()}
                className="shrink-0"
              >
                <SendHorizonal className="size-4" />
                {streaming ? "回答中" : "发送"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 搜索输入 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="term-rule flex items-center gap-2 border-b p-3 md:px-5"
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="用自然语言描述想找的内容，如：数据可视化相关的项目"
              className="np-input np-input-term h-9 flex-1 text-sm"
            />
            <Button type="submit" disabled={searching || !searchQuery.trim()} className="shrink-0">
              <Search className="size-4" />
              {searching ? "搜索中" : "搜索"}
            </Button>
          </form>

          {/* 搜索结果 */}
          <div className="min-h-[40vh] bg-[#101010] p-4 md:p-5">
            {searchError && (
              <p className="border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs text-[#ECE5D6]">
                {searchError}
              </p>
            )}
            {results === null && !searchError && (
              <p className="py-16 text-center font-mono text-xs tracking-[0.14em] text-[#ECE5D6]/40 uppercase">
                {"// 输入关键词开始语义搜索"}
              </p>
            )}
            {results !== null && results.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-mono text-xs tracking-[0.14em] text-[#ECE5D6]/50 uppercase">
                  {"// NO RESULT"}
                </p>
                <p className="mt-2 text-xs text-[#ECE5D6]/40">
                  没有找到相似内容，换个描述试试
                </p>
              </div>
            )}
            <div className="space-y-2">
              {results?.map((r) => (
                <Link
                  key={`${r.sourceType}:${r.sourceId}`}
                  href={r.url}
                  className="group block border border-[#ECE5D6]/20 p-3.5 transition-none hover:border-[#ECE5D6]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[#ECE5D6]/45 uppercase">
                      {r.sourceType === "project" ? "项目" : "文章"}
                    </span>
                    <h3 className="text-sm font-semibold text-[#ECE5D6]">
                      {r.title}
                    </h3>
                    <span
                      className={cn(
                        "ml-auto font-mono text-sm font-bold",
                        similarityClass(r.similarity),
                      )}
                    >
                      {Math.round(r.similarity * 100)}%
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-[#ECE5D6]/50">
                    {r.snippet}…
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
