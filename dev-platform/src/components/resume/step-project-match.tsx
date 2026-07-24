"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Crosshair, Loader2, Wand2 } from "lucide-react";
import type { Project, ProjectMatch, SkillGap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

/** 匹配度分色：>80 青 / 50-80 琥珀 / <50 灰 */
function scoreTextClass(score: number): string {
  if (score > 80) return "text-primary";
  if (score >= 50) return "text-accent";
  return "text-muted-foreground";
}

function scoreIndicatorClass(score: number): string {
  if (score > 80) return "[&_[data-slot=progress-indicator]]:bg-primary";
  if (score >= 50) return "[&_[data-slot=progress-indicator]]:bg-accent";
  return "[&_[data-slot=progress-indicator]]:bg-muted-foreground";
}

interface StepProjectMatchProps {
  resumeId: string;
  projects: Project[];
  matches: ProjectMatch[];
  selectedIds: string[];
  finalDescriptions: Record<string, string>;
  matching: boolean;
  onMatch: () => void;
  onToggle: (projectId: string, checked: boolean) => void;
  onDescriptionChange: (projectId: string, text: string) => void;
  onDescriptionCommit: () => void;
}

/** 步骤 2：项目匹配 — 评分、理由、可编辑的建议描述、勾选纳入简历 */
export function StepProjectMatch({
  resumeId,
  projects,
  matches,
  selectedIds,
  finalDescriptions,
  matching,
  onMatch,
  onToggle,
  onDescriptionChange,
  onDescriptionCommit,
}: StepProjectMatchProps) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const matchedIds = new Set(matches.map((m) => m.projectId));
  // 未参与匹配的项目（项目数超过 20 时仅最近 20 个参与）
  const unmatched = projects.filter((p) => !matchedIds.has(p.id));

  // ---- 技能缺口分析（Phase 7） ----
  const [gapChecking, setGapChecking] = useState(false);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  const [gapResult, setGapResult] = useState<{
    gaps: SkillGap[];
    recommendations: unknown[];
  } | null>(null);
  // 该简历已有推荐方案数（>0 时需用户确认重新生成）
  const [existingCount, setExistingCount] = useState<number | null>(null);

  async function analyzeGaps(force: boolean) {
    setGapError(null);
    // 非强制时先检查已有推荐，由用户选择重新生成或查看
    if (!force) {
      setGapChecking(true);
      try {
        const res = await fetch(`/api/recommended?resume_id=${resumeId}`);
        const data = await res.json().catch(() => null);
        if (res.ok && (data?.recommendations?.length ?? 0) > 0) {
          setExistingCount(data.recommendations.length);
          return;
        }
      } catch {
        // 检查失败不阻塞，直接走生成
      } finally {
        setGapChecking(false);
      }
    }
    setGapLoading(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/gaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "分析失败，请重试");
      }
      setGapResult(data);
      setExistingCount(null);
    } catch (err) {
      setGapError(err instanceof Error ? err.message : "分析失败，请重试");
    } finally {
      setGapLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {matches.length > 0
            ? `已匹配 ${matches.length} 个项目，勾选 ${selectedIds.length} 个纳入简历（默认勾选评分前 5）`
            : "AI 将根据 JD 分析对项目库中的已发布项目评分"}
        </p>
        <Button onClick={onMatch} disabled={matching} className="rounded-sm">
          {matching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {matching ? "匹配中…" : matches.length > 0 ? "重新匹配" : "匹配项目"}
        </Button>
      </div>

      {/* 技能缺口分析（Phase 7） */}
      <section className="border border-border bg-card/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              技能缺口分析 //
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              对照 JD 技能要求与项目库技术栈，找出缺失技能并生成练习项目方案
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            disabled={gapChecking || gapLoading}
            onClick={() => void analyzeGaps(false)}
          >
            {gapChecking || gapLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Crosshair className="size-3.5" />
            )}
            {gapChecking ? "检查中…" : gapLoading ? "分析生成中…" : "分析技能缺口"}
          </Button>
        </div>

        {gapError && (
          <p className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {gapError}
          </p>
        )}

        {/* 已有推荐：重新生成 or 查看 */}
        {existingCount !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border border-accent/40 bg-accent/5 px-3 py-2.5">
            <p className="text-sm text-foreground/90">
              该岗位已有 <span className="font-mono font-bold text-accent">{existingCount}</span> 条推荐方案
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm"
                disabled={gapLoading}
                onClick={() => void analyzeGaps(true)}
              >
                {gapLoading && <Loader2 className="size-3.5 animate-spin" />}
                重新生成
              </Button>
              <Link
                href={`/projects/recommended?resume_id=${resumeId}`}
                className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                查看方案
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}

        {/* 缺口摘要 */}
        {gapResult && (
          <div className="mt-3 space-y-2">
            {gapResult.gaps.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {gapResult.gaps.map((gap) => (
                    <Badge
                      key={gap.skill}
                      variant="outline"
                      className={cn(
                        "rounded-sm font-mono",
                        gap.coverage === "missing"
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-accent/50 bg-accent/10 text-accent",
                      )}
                      title={
                        gap.coverage === "weak"
                          ? `仅 ${gap.coveredBy[0]} 覆盖`
                          : "项目库中无覆盖"
                      }
                    >
                      {gap.skill} · {gap.coverage === "missing" ? "缺失" : "覆盖不足"}
                    </Badge>
                  ))}
                </div>
                <Link
                  href={`/projects/recommended?resume_id=${resumeId}`}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  查看推荐项目方案（{gapResult.recommendations.length} 个）
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-success">
                未检测到技能缺口：项目库已覆盖 JD 的主要技能要求
              </p>
            )}
          </div>
        )}
      </section>

      {matches.length === 0 && !matching && (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO MATCH RESULT"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            点击「匹配项目」开始 AI 评分
          </p>
        </div>
      )}

      <div className="space-y-3">
        {matches.map((match) => {
          const project = projectById.get(match.projectId);
          if (!project) return null;
          const checked = selectedIds.includes(match.projectId);
          return (
            <section
              key={match.projectId}
              className={cn(
                "clip-corner border border-border bg-card p-4 transition-opacity",
                !checked && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => onToggle(match.projectId, c)}
                  aria-label={`选择 ${project.title}`}
                />
                <h3 className="font-semibold">{project.title}</h3>
                <div className="ml-auto flex w-40 items-center gap-2">
                  <Progress
                    value={match.score}
                    className={cn("flex-1", scoreIndicatorClass(match.score))}
                  />
                  <span
                    className={cn(
                      "w-10 text-right font-mono text-sm font-bold",
                      scoreTextClass(match.score),
                    )}
                  >
                    {match.score}%
                  </span>
                </div>
              </div>

              {match.reason && (
                <p className="mt-2 pl-7 text-xs text-muted-foreground">
                  评分理由：{match.reason}
                </p>
              )}

              {match.relevantSkills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                  {match.relevantSkills.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="rounded-sm font-mono text-[10px] text-muted-foreground"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-3 pl-7">
                <Textarea
                  value={finalDescriptions[match.projectId] ?? match.suggestedDescription}
                  onChange={(e) =>
                    onDescriptionChange(match.projectId, e.target.value)
                  }
                  onBlur={onDescriptionCommit}
                  rows={3}
                  placeholder="针对该岗位的项目描述（可直接编辑，失焦自动保存）"
                  className="rounded-sm text-sm"
                />
              </div>
            </section>
          );
        })}
      </div>

      {unmatched.length > 0 && matches.length > 0 && (
        <p className="font-mono text-[10px] text-muted-foreground">
          注：{unmatched.length} 个项目未参与本次匹配（仅最近更新的 20 个项目参与评分）：
          {unmatched.map((p) => p.title).join("、")}
        </p>
      )}
    </div>
  );
}
