"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
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
  sources?: RagSource[];
}

const EXAMPLE_QUESTIONS = [
  "你做过哪些 React 项目？",
  "平台主人擅长哪些技术栈？",
  "有没有关于 Next.js 的文章？",
];

const SESSION_KEY = "chat-session-id";

/** 相似度分色（复用匹配度配色直觉） */
function similarityClass(similarity: number): string {
  if (similarity > 0.6) return "text-primary";
  if (similarity >= 0.4) return "text-accent";
  return "text-muted-foreground";
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
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      { id: aiId, role: "assistant", content: "", sources: [] },
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
    <section className="clip-corner border border-border bg-card">
      {/* 模式切换 */}
      <div className="flex items-center border-b border-border">
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
              "flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs transition-colors",
              mode === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
        {mode === "chat" && (
          <button
            onClick={newSession}
            className="ml-auto mr-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary"
          >
            <RotateCcw className="size-3" />
            新会话
          </button>
        )}
      </div>

      {mode === "chat" ? (
        <>
          {/* 消息列表 */}
          <div ref={listRef} className="h-[52vh] space-y-4 overflow-y-auto p-4 md:p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquarePlus className="size-8 text-primary/60" />
                <p className="mt-4 font-bold">你好，我是平台 AI 助手</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  我的知识来自项目库与博客文章，试试这些问题：
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-sm border px-4 py-2.5 md:max-w-[75%]",
                      m.role === "user"
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                      {m.role === "assistant" && streaming && m.content === "" && (
                        <span className="font-mono text-muted-foreground">思考中…</span>
                      )}
                      {m.role === "assistant" &&
                        streaming &&
                        m.content !== "" &&
                        messages[messages.length - 1]?.id === m.id && (
                          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-text-bottom" />
                        )}
                    </p>
                    {/* 来源 chips */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                        {m.sources.map((s) => (
                          <Link
                            key={s.url}
                            href={s.url}
                            className="flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                          >
                            <ExternalLink className="size-2.5" />
                            {s.type === "project" ? "项目" : "文章"} · {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="mx-4 mb-2 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-5">
              {error}
            </p>
          )}

          {/* 输入区 */}
          <div className="border-t border-border p-3 md:px-5">
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
                className="flex-1 resize-none rounded-sm border border-input bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50"
              />
              <Button
                onClick={() => void send(input)}
                disabled={streaming || !input.trim()}
                className="rounded-sm"
              >
                {streaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizonal className="size-4" />
                )}
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
            className="flex items-center gap-2 border-b border-border p-3 md:px-5"
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="用自然语言描述想找的内容，如：数据可视化相关的项目"
              className="h-9 flex-1 rounded-sm border border-input bg-input/30 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
            />
            <Button type="submit" disabled={searching || !searchQuery.trim()} className="rounded-sm">
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {searching ? "搜索中" : "搜索"}
            </Button>
          </form>

          {/* 搜索结果 */}
          <div className="min-h-[40vh] p-4 md:p-5">
            {searchError && (
              <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {searchError}
              </p>
            )}
            {results === null && !searchError && (
              <p className="py-16 text-center font-mono text-xs text-muted-foreground">
                {"// 输入关键词开始语义搜索"}
              </p>
            )}
            {results !== null && results.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-mono text-xs tracking-widest text-muted-foreground">
                  {"// NO RESULT"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  没有找到相似内容，换个描述试试
                </p>
              </div>
            )}
            <div className="space-y-3">
              {results?.map((r) => (
                <Link
                  key={`${r.sourceType}:${r.sourceId}`}
                  href={r.url}
                  className="clip-corner group block border border-border bg-background p-4 transition-colors hover:border-primary/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      {r.sourceType === "project" ? "项目" : "文章"}
                    </span>
                    <h3 className="font-semibold transition-colors group-hover:text-primary">
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
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
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
