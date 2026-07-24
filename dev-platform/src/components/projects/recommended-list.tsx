"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CirclePlay,
  Clock3,
  GraduationCap,
  Lightbulb,
  Loader2,
  Play,
  Target,
} from "lucide-react";
import {
  RECOMMENDED_STATUS_LABELS,
  type RecommendedProjectWithRole,
  type RecommendedStatus,
  type Resume,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** 状态徽标配色：saved=灰 / started=青 / completed=绿 */
const STATUS_STYLE: Record<RecommendedStatus, string> = {
  saved: "border-border bg-muted text-muted-foreground",
  started: "border-primary/50 bg-primary/10 text-primary",
  completed: "border-success/50 bg-success/10 text-success",
};

/** 学习资源图标按类型区分 */
function ResourceIcon({ type }: { type: string }) {
  if (type === "video") return <CirclePlay className="size-3.5" />;
  if (type === "course") return <GraduationCap className="size-3.5" />;
  return <BookOpen className="size-3.5" />;
}

interface RecommendedListProps {
  initialRecommendations: RecommendedProjectWithRole[];
  resumes: Pick<Resume, "id" | "target_role" | "created_at">[];
  initialResumeId: string;
}

export function RecommendedList({
  initialRecommendations,
  resumes,
  initialResumeId,
}: RecommendedListProps) {
  const [items, setItems] = useState(initialRecommendations);
  const [resumeFilter, setResumeFilter] = useState(initialResumeId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = resumeFilter
    ? items.filter((r) => r.resume_id === resumeFilter)
    : items;

  function patchItem(id: string, patch: Partial<RecommendedProjectWithRole>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function updateStatus(id: string, status: RecommendedStatus) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/recommended/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "操作失败，请重试");
      patchItem(id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setPendingId(null);
    }
  }

  async function convert(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/recommended/${id}/convert`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "转化失败，请重试");
      patchItem(id, {
        converted_project_id: data.projectId,
        status: "completed",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "转化失败，请重试");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 简历筛选 */}
      {resumes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            按岗位筛选 //
          </span>
          <select
            value={resumeFilter}
            onChange={(e) => setResumeFilter(e.target.value)}
            className="h-8 rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
          >
            <option value="">全部岗位</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.target_role ?? "未命名岗位"} · {r.created_at.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO DATA"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            暂无推荐方案，请先到「简历生成」向导第 2 步点击「分析技能缺口」
          </p>
          <Link
            href="/resume"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
          >
            前往简历生成
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => {
            const plan = rec.project_plan;
            const pending = pendingId === rec.id;
            return (
              <section
                key={rec.id}
                className="clip-corner border border-border bg-card p-5"
              >
                {/* 头部 */}
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <Badge
                    variant="outline"
                    className="rounded-sm border-accent/50 bg-accent/10 font-mono text-accent"
                  >
                    缺口：{rec.skill_gap}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("rounded-sm", STATUS_STYLE[rec.status])}
                  >
                    {RECOMMENDED_STATUS_LABELS[rec.status]}
                  </Badge>
                  {rec.target_role && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      目标岗位：{rec.target_role}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-foreground/90">
                  {plan.description}
                </p>

                {/* 推荐理由 */}
                {plan.whyRecommended && (
                  <p className="mt-2 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
                    <span className="font-mono text-[10px] tracking-widest text-primary">
                      推荐理由 //
                    </span>
                    <br />
                    {plan.whyRecommended}
                  </p>
                )}

                {/* 技术栈 + 预计周期 */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {plan.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {plan.techStack.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="rounded-sm font-mono text-[10px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" />
                    预计 {plan.estimatedDays} 天
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {/* 核心功能 */}
                  {plan.features.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        <Target className="size-3.5" />
                        核心功能
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-foreground/90">
                            <span className="font-mono text-primary">▸</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 实现思路 */}
                  {plan.implementation && (
                    <div>
                      <h3 className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        <Lightbulb className="size-3.5" />
                        实现思路
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                        {plan.implementation}
                      </p>
                    </div>
                  )}
                </div>

                {/* 学习资源 */}
                {plan.learningResources.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      学习资源
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {plan.learningResources.map((r, i) => (
                        <li key={i}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                          >
                            <ResourceIcon type={r.type} />
                            <span className="group-hover:underline">{r.title}</span>
                            <ArrowUpRight className="size-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 简历价值 */}
                {plan.resumeValue && (
                  <p className="mt-4 border-l-2 border-accent/60 bg-accent/5 py-1.5 pl-3 text-sm text-muted-foreground">
                    <span className="font-mono text-[10px] tracking-widest text-accent">
                      简历价值 //
                    </span>
                    <br />
                    {plan.resumeValue}
                  </p>
                )}

                {/* 操作区 */}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  {rec.converted_project_id ? (
                    <Link
                      href={`/projects/${rec.converted_project_id}`}
                      className="flex items-center gap-1.5 font-mono text-xs text-success hover:underline"
                    >
                      <Check className="size-3.5" />
                      已转化 → 查看项目
                    </Link>
                  ) : (
                    <>
                      {rec.status === "saved" && (
                        <Button
                          size="sm"
                          className="rounded-sm"
                          disabled={pending}
                          onClick={() => void updateStatus(rec.id, "started")}
                        >
                          {pending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                          加入计划
                        </Button>
                      )}
                      {rec.status === "started" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-sm"
                            disabled={pending}
                            onClick={() => void updateStatus(rec.id, "completed")}
                          >
                            <Check className="size-3.5" />
                            标记完成
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-sm"
                            disabled={pending}
                            onClick={() => void convert(rec.id)}
                          >
                            {pending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="size-3.5" />
                            )}
                            转为正式项目
                          </Button>
                        </>
                      )}
                      {rec.status === "completed" && (
                        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Check className="size-3.5 text-success" />
                          已完成 · 可随时转为正式项目
                        </span>
                      )}
                      {rec.status === "completed" && (
                        <Button
                          size="sm"
                          className="rounded-sm"
                          disabled={pending}
                          onClick={() => void convert(rec.id)}
                        >
                          {pending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="size-3.5" />
                          )}
                          转为正式项目
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
