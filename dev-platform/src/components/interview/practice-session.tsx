"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Check,
  FolderKanban,
  Loader2,
  SendHorizonal,
} from "lucide-react";
import {
  INTERVIEW_CATEGORY_LABELS,
  type AnswerFeedback,
  type InterviewQuestion,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreBar } from "./score-bar";

const MAX_ANSWER_LENGTH = 3000;

const DIFFICULTY_STYLE: Record<number, string> = {
  1: "border-success/50 bg-success/10 text-success",
  2: "border-accent/50 bg-accent/10 text-accent",
  3: "border-destructive/50 bg-destructive/10 text-destructive",
};
const DIFFICULTY_LABELS: Record<number, string> = { 1: "简单", 2: "中等", 3: "困难" };

const STAR_ITEMS = [
  { key: "situation", label: "S · 情境" },
  { key: "task", label: "T · 任务" },
  { key: "action", label: "A · 行动" },
  { key: "result", label: "R · 结果" },
] as const;

export function PracticeSession({
  question,
  linkedProject,
}: {
  question: InterviewQuestion;
  linkedProject: { id: string; title: string } | null;
}) {
  const [answer, setAnswer] = useState(question.user_answer ?? "");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(
    question.ai_feedback,
  );
  const [status, setStatus] = useState(question.status);
  const [submitting, setSubmitting] = useState(false);
  const [mastering, setMastering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAnswer() {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/questions/${question.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "评估失败，请重试");
      }
      setFeedback(data.feedback as AnswerFeedback);
      setStatus("practiced");
    } catch (err) {
      setError(err instanceof Error ? err.message : "评估失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function markMastered() {
    setMastering(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "mastered" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "操作失败，请重试");
      }
      setStatus("mastered");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setMastering(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 题目卡 */}
      <section className="clip-corner border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-sm border-primary/50 bg-primary/10 text-primary"
          >
            {INTERVIEW_CATEGORY_LABELS[question.category]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("rounded-sm", DIFFICULTY_STYLE[question.difficulty])}
          >
            {DIFFICULTY_LABELS[question.difficulty] ?? `难度${question.difficulty}`}
          </Badge>
          {status === "mastered" && (
            <Badge
              variant="outline"
              className="rounded-sm border-success/50 bg-success/10 text-success"
            >
              <Check className="size-3" />
              已掌握
            </Badge>
          )}
          {linkedProject && (
            <Link
              href={`/projects/${linkedProject.id}`}
              className="ml-auto flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <FolderKanban className="size-3.5" />
              {linkedProject.title}
            </Link>
          )}
        </div>
        <h2 className="mt-3 text-lg leading-relaxed font-bold">
          {question.question}
        </h2>
        {question.assessment_points.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              考察点 //
            </span>
            {question.assessment_points.map((p) => (
              <span
                key={p}
                className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 回答区 */}
      <section className="clip-corner border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            你的回答
          </h3>
          <span
            className={cn(
              "font-mono text-[10px]",
              answer.length > MAX_ANSWER_LENGTH
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {answer.length} / {MAX_ANSWER_LENGTH}
          </span>
        </div>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="按 STAR 法则组织回答：情境 → 任务 → 行动 → 结果…"
          className="mt-2 rounded-sm"
        />
        {error && (
          <p className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void submitAnswer()}
            disabled={submitting || !answer.trim()}
            className="rounded-sm"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
            {submitting ? "评估中…" : feedback ? "重新提交评估" : "提交回答"}
          </Button>
          {status !== "mastered" && (
            <Button
              variant="outline"
              onClick={() => void markMastered()}
              disabled={mastering}
              className="rounded-sm"
            >
              {mastering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Award className="size-4" />
              )}
              标记掌握
            </Button>
          )}
        </div>
      </section>

      {/* AI 反馈 */}
      {feedback && (
        <section className="clip-corner border border-primary/30 bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs tracking-widest text-primary uppercase">
              AI 评估反馈
            </h3>
            <span className="font-mono text-2xl font-bold text-primary">
              {feedback.overallScore}
              <span className="text-xs text-muted-foreground"> / 10</span>
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <ScoreBar label="完整度" value={feedback.completeness} />
            <ScoreBar label="技术深度" value={feedback.technicalDepth} />
            <ScoreBar label="结构表达" value={feedback.structure} />
          </div>

          {/* STAR 四象限 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {STAR_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-sm border border-border bg-background p-3"
              >
                <p className="font-mono text-[10px] tracking-widest text-accent">
                  {item.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">
                  {feedback.starAnalysis[item.key] || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* 总评 */}
          {feedback.feedback && (
            <p className="mt-4 border-l-2 border-primary/60 pl-3 text-sm leading-relaxed text-foreground/90">
              {feedback.feedback}
            </p>
          )}

          {/* 建议 */}
          {feedback.suggestions.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {feedback.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-accent">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 参考答案 / 追问方向（默认折叠，防先看答案） */}
      {(question.reference_answer || question.follow_ups.length > 0) && (
        <section className="clip-corner border border-border bg-card">
          {question.reference_answer && (
            <details className="group border-b border-border last:border-0">
              <summary className="cursor-pointer px-5 py-3 font-mono text-xs text-muted-foreground transition-colors select-none hover:text-primary">
                ▶ 参考答案（点击展开）
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {question.reference_answer}
              </p>
            </details>
          )}
          {question.follow_ups.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer px-5 py-3 font-mono text-xs text-muted-foreground transition-colors select-none hover:text-primary">
                ▶ 可能的追问方向（点击展开）
              </summary>
              <ul className="space-y-1.5 px-5 pb-4">
                {question.follow_ups.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-primary">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
