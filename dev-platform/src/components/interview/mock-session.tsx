"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  SendHorizonal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { MockEvaluation, MockInterview, MockMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScoreBar } from "./score-bar";

const MAX_MESSAGE_LENGTH = 2000;

/** ISO → 本地 hh:mm:ss（终端日志戳，与 /chat 保持一致） */
function stamp(iso?: string): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/** 评估报告卡片（结束后展示）：纸质档案感，用 Card 承载 */
function EvaluationReport({ evaluation }: { evaluation: MockEvaluation }) {
  return (
    <Card>
      <div className="px-5">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
            面试评估报告 <span className="opacity-60">{"// DEBRIEF"}</span>
          </h3>
          <span className="tnum font-mono text-3xl font-bold text-foreground">
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
            <h4 className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-chart-blue uppercase">
              <ThumbsUp className="size-3.5" />
              优势
            </h4>
            <ul className="mt-2 space-y-1.5">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="font-mono text-chart-blue">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-destructive uppercase">
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
            <h4 className="font-mono text-[10px] tracking-[0.16em] text-chart-orange uppercase">
              改进建议
            </h4>
            <ul className="mt-2 space-y-1.5">
              {evaluation.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="font-mono text-chart-orange">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
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
      <section className="term-panel border border-foreground">
        {/* 轮数指示 */}
        <div className="term-rule flex items-center justify-between border-b px-4 py-2.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-[#ECE5D6]/55 uppercase">
            MOCK_INTERVIEW {"//"} {done ? "已结束" : "进行中"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#ECE5D6]/55">
            第 {candidateTurns} / 9 轮
          </span>
        </div>

        {/* 消息流：无气泡，1px 细线分割 */}
        <div ref={listRef} className="h-[52vh] overflow-y-auto bg-[#101010]">
          {messages.map((m, i) => (
            <div key={i} className="term-rule border-b px-4 py-3.5 md:px-5">
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase">
                <span className="text-[#ECE5D6]/45">
                  [{m.role === "interviewer" ? "SYS_LOG" : "INPUT"} {"//"}{" "}
                  <span suppressHydrationWarning>{stamp(m.ts)}</span>]
                </span>
                <span className="ml-2 text-[#ECE5D6]/35">
                  {m.role === "interviewer" ? "面试官" : "候选人"}
                </span>
              </p>
              <div className="mt-1.5 flex gap-2">
                {m.role === "candidate" && (
                  <span className="shrink-0 font-mono text-xs leading-relaxed text-primary">
                    {">_"}
                  </span>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#ECE5D6]">
                  {m.content}
                </p>
              </div>
            </div>
          ))}

          {/* 等待回复：文本闪烁，不用转圈 */}
          {sending && (
            <div className="term-rule border-b px-4 py-3.5 md:px-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#ECE5D6]/45 uppercase">
                [SYS_LOG {"//"} ...]
              </p>
              <p className="term-blink mt-1.5 font-mono text-[11px] tracking-[0.14em] text-[#ECE5D6]/65">
                [ LOADING... ]
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="term-rule mx-4 mt-2 border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs text-[#ECE5D6] md:mx-5">
            {">_ "}
            {error}
          </p>
        )}

        {/* 输入区 / 结束状态 */}
        {done ? (
          <div className="term-rule border-t px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-xs text-[#ECE5D6]/70">
              <CircleCheck className="size-4" />
              {"// SESSION TERMINATED — 评估报告已生成"}
            </p>
          </div>
        ) : (
          <div className="term-rule border-t p-3 md:px-5">
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
                className="np-input np-textarea np-input-term flex-1 resize-none text-sm disabled:opacity-60"
              />
              <Button
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="shrink-0"
              >
                <SendHorizonal className="size-4" />
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
