"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  Loader2,
  SendHorizonal,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import type { MockEvaluation, MockInterview, MockMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "./score-bar";

const MAX_MESSAGE_LENGTH = 2000;

/** 评估报告卡片（结束后展示） */
function EvaluationReport({ evaluation }: { evaluation: MockEvaluation }) {
  return (
    <section className="clip-corner border border-primary/30 bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs tracking-widest text-primary uppercase">
          面试评估报告
        </h3>
        <span className="font-mono text-3xl font-bold text-primary">
          {evaluation.overallScore}
          <span className="text-xs text-muted-foreground"> / 10</span>
        </span>
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <ScoreBar label="技术深度" value={evaluation.technicalDepth} />
        <ScoreBar label="项目表达" value={evaluation.projectClarity} />
        <ScoreBar label="沟通表达" value={evaluation.communicationSkill} />
        <ScoreBar label="解决问题" value={evaluation.problemSolving} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <h4 className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-success uppercase">
            <ThumbsUp className="size-3.5" />
            优势
          </h4>
          <ul className="mt-2 space-y-1.5">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="font-mono text-success">▸</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-destructive uppercase">
            <ThumbsDown className="size-3.5" />
            薄弱点
          </h4>
          <ul className="mt-2 space-y-1.5">
            {evaluation.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="font-mono text-destructive">▸</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-accent uppercase">
            改进建议
          </h4>
          <ul className="mt-2 space-y-1.5">
            {evaluation.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="font-mono text-accent">▸</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** 模拟面试会话（非流式：发送后等待完整回复） */
export function MockSession({ interview }: { interview: MockInterview }) {
  const [messages, setMessages] = useState<MockMessage[]>(
    interview.conversation ?? [],
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!!interview.completed_at);
  const [evaluation, setEvaluation] = useState<MockEvaluation | null>(
    interview.evaluation,
  );
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息滚动到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  const candidateTurns = messages.filter((m) => m.role === "candidate").length;

  async function send() {
    const text = input.trim();
    if (!text || sending || done) return;
    setInput("");
    setError(null);
    setSending(true);
    // 乐观上屏候选人消息
    setMessages((prev) => [
      ...prev,
      { role: "candidate", content: text, ts: new Date().toISOString() },
    ]);
    try {
      const res = await fetch(`/api/interview/mock/${interview.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "发送失败，请重试");
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "interviewer",
          content: data.reply as string,
          ts: new Date().toISOString(),
        },
      ]);
      if (data.done) {
        setDone(true);
        setEvaluation(data.evaluation as MockEvaluation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败，请重试");
      // 回滚乐观上屏的消息
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="clip-corner border border-border bg-card">
        {/* 轮数指示 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            MOCK INTERVIEW // {done ? "已结束" : "进行中"}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            第 {candidateTurns} / 9 轮
          </span>
        </div>

        {/* 消息列表 */}
        <div ref={listRef} className="h-[52vh] space-y-4 overflow-y-auto p-4 md:p-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "candidate" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-sm border px-4 py-2.5 md:max-w-[75%]",
                  m.role === "candidate"
                    ? "border-primary/40 bg-primary/15"
                    : "border-border bg-background",
                )}
              >
                <p
                  className={cn(
                    "mb-1 flex items-center gap-1 font-mono text-[10px]",
                    m.role === "interviewer"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <UserRound className="size-3" />
                  {m.role === "interviewer" ? "面试官" : "我"}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-sm border border-border bg-background px-4 py-2.5">
                <p className="mb-1 font-mono text-[10px] text-primary">面试官</p>
                <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  思考中…
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mx-4 mb-2 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-5">
            {error}
          </p>
        )}

        {/* 输入区 / 结束状态 */}
        {done ? (
          <div className="border-t border-border px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-xs text-success">
              <CircleCheck className="size-4" />
              面试已结束，评估报告如下
            </p>
          </div>
        ) : (
          <div className="border-t border-border p-3 md:px-5">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="回答面试官的问题，Enter 发送，Shift+Enter 换行"
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={sending}
                className="flex-1 resize-none rounded-sm border border-input bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50"
              />
              <Button
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="rounded-sm"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizonal className="size-4" />
                )}
                {sending ? "等待回复" : "发送"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 评估报告 */}
      {evaluation && <EvaluationReport evaluation={evaluation} />}
    </div>
  );
}
