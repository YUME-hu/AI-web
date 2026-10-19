"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  ChevronRight,
  Loader2,
  MessagesSquare,
  Trophy,
} from "lucide-react";
import {
  INTERVIEW_CATEGORY_LABELS,
  INTERVIEW_STATUS_LABELS,
  type InterviewCategory,
  type InterviewQuestion,
  type InterviewQuestionStatus,
  type Resume,
} from "@/lib/types";
import type { MockListItem } from "@/app/(main)/interview/page";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** 难度徽标配色：1=绿 2=琥珀 3=红 */
const DIFFICULTY_STYLE: Record<number, string> = {
  1: "border-success/50 bg-success/10 text-success",
  2: "border-accent/50 bg-accent/10 text-accent",
  3: "border-destructive/50 bg-destructive/10 text-destructive",
};
const DIFFICULTY_LABELS: Record<number, string> = { 1: "简单", 2: "中等", 3: "困难" };

const CATEGORY_BADGE_STYLE: Record<InterviewCategory, string> = {
  technical: "border-chart-blue/50 bg-chart-blue/10 text-chart-blue",
  project: "border-success/50 bg-success/10 text-success",
  system_design: "border-accent/50 bg-accent/10 text-accent",
  behavioral: "border-border bg-muted text-muted-foreground",
};

const STATUS_BADGE_STYLE: Record<InterviewQuestionStatus, string> = {
  new: "border-border bg-muted text-muted-foreground",
  practiced: "border-foreground/40 bg-muted text-foreground",
  mastered: "border-success/50 bg-success/10 text-success",
};

const CATEGORY_TABS: { key: InterviewCategory | ""; label: string }[] = [
  { key: "", label: "全部" },
  { key: "technical", label: "技术" },
  { key: "project", label: "项目" },
  { key: "system_design", label: "系统设计" },
  { key: "behavioral", label: "行为" },
];

interface InterviewHomeProps {
  resumes: Pick<Resume, "id" | "target_role" | "created_at">[];
  initialQuestions: InterviewQuestion[];
  mockInterviews: MockListItem[];
}

export function InterviewHome({
  resumes,
  initialQuestions,
  mockInterviews,
}: InterviewHomeProps) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const [startingMock, setStartingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 已有题目时的确认状态（409）
  const [conflictCount, setConflictCount] = useState<number | null>(null);

  const [category, setCategory] = useState<InterviewCategory | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");

  const filtered = initialQuestions.filter((q) => {
    if (category && q.category !== category) return false;
    if (difficulty && q.difficulty !== Number(difficulty)) return false;
    if (status && q.status !== status) return false;
    return true;
  });

  async function generateQuestions(force: boolean) {
    if (!resumeId) {
      setError("请先选择目标岗位简历");
      return;
    }
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setConflictCount(data?.count ?? 0);
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error ?? "生成失败，请重试");
      }
      setConflictCount(null);
      setNotice(`已生成 ${data.count} 道面试题`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function startMock() {
    if (!resumeId) {
      setError("请先选择目标岗位简历");
      return;
    }
    setStartingMock(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "创建失败，请重试");
      }
      router.push(`/interview/mock/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请重试");
      setStartingMock(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 操作区 */}
      <section className="card-hazard rivet border border-foreground bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] text-muted-foreground">
              目标岗位简历
            </p>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="h-8 w-64 rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
            >
              {resumes.length === 0 && <option value="">暂无简历</option>}
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.target_role ?? "未命名岗位"} · {r.created_at.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => void generateQuestions(false)}
            disabled={generating || resumes.length === 0}
            className="rounded-sm"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BrainCircuit className="size-4" />
            )}
            {generating ? "生成中…" : "生成面试题"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void startMock()}
            disabled={startingMock || resumes.length === 0}
            className="rounded-sm"
          >
            {startingMock ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessagesSquare className="size-4" />
            )}
            {startingMock ? "面试官入场中…" : "开始模拟面试"}
          </Button>
        </div>

        {resumes.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            请先到「简历生成」粘贴 JD 创建一份简历，面试题将基于 JD 分析生成。
          </p>
        )}
        {error && (
          <p className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-3 border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            {notice}
          </p>
        )}
        {/* 已有题目：确认重新生成 */}
        {conflictCount !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border border-accent/40 bg-accent/5 px-3 py-2.5">
            <p className="text-sm text-foreground/90">
              该岗位已有{" "}
              <span className="font-mono font-bold text-accent">{conflictCount}</span>{" "}
              道面试题（含练习记录），重新生成将覆盖
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm"
                disabled={generating}
                onClick={() => void generateQuestions(true)}
              >
                {generating && <Loader2 className="size-3.5 animate-spin" />}
                重新生成
              </Button>
              <button
                onClick={() => setConflictCount(null)}
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 题库区 */}
      <section>
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-0">
          <nav className="flex">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={cn(
                  "border-b-2 px-4 py-2.5 font-mono text-xs transition-colors",
                  category === tab.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 pb-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="h-7 rounded-sm border border-input bg-input/30 px-2 font-mono text-xs outline-none [color-scheme:dark]"
            >
              <option value="">全部难度</option>
              <option value="1">简单</option>
              <option value="2">中等</option>
              <option value="3">困难</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-7 rounded-sm border border-input bg-input/30 px-2 font-mono text-xs outline-none [color-scheme:dark]"
            >
              <option value="">全部状态</option>
              {Object.entries(INTERVIEW_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((q) => (
              <Link
                key={q.id}
                href={`/interview/practice/${q.id}`}
                className="card-hazard rivet group flex flex-col border border-foreground bg-card p-4 transition-colors hover:border-foreground"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("rounded-sm", CATEGORY_BADGE_STYLE[q.category])}
                  >
                    {INTERVIEW_CATEGORY_LABELS[q.category]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("rounded-sm", DIFFICULTY_STYLE[q.difficulty])}
                  >
                    {DIFFICULTY_LABELS[q.difficulty] ?? `难度${q.difficulty}`}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("ml-auto rounded-sm", STATUS_BADGE_STYLE[q.status])}
                  >
                    {INTERVIEW_STATUS_LABELS[q.status]}
                  </Badge>
                </div>
                <p className="mt-2.5 line-clamp-2 text-sm font-medium transition-colors group-hover:text-chart-blue">
                  {q.question}
                </p>
                {q.assessment_points.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {q.assessment_points.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-border px-6 py-14 text-center">
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {"// NO QUESTIONS"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {initialQuestions.length === 0
                ? "题库为空，选择简历后点击「生成面试题」"
                : "该筛选条件下暂无题目"}
            </p>
          </div>
        )}
      </section>

      {/* 模拟面试历史 */}
      <section>
        <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          <Trophy className="size-4" />
          模拟面试记录
        </h2>
        {mockInterviews.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {mockInterviews.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/interview/mock/${m.id}`}
                  className="group flex items-center gap-4 rounded-sm border border-foreground bg-card px-4 py-3 transition-colors hover:border-foreground"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold transition-colors group-hover:text-chart-blue">
                      {m.target_role ?? "未命名岗位"}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {m.started_at.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                  {m.evaluation && (
                    <span className="font-mono text-sm font-bold text-foreground">
                      {m.evaluation.overallScore}
                      <span className="text-[10px] text-muted-foreground"> 分</span>
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-sm",
                      m.completed_at
                        ? "border-success/50 bg-success/10 text-success"
                        : "border-accent/50 bg-accent/10 text-accent",
                    )}
                  >
                    {m.completed_at ? "已完成" : "进行中"}
                  </Badge>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground group-hover:text-chart-blue">
                    {m.completed_at ? "查看报告" : "继续面试"}
                    <ChevronRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            暂无模拟面试记录，点击上方「开始模拟面试」发起第一场
          </p>
        )}
      </section>
    </div>
  );
}
