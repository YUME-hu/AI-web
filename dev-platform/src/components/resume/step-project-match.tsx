"use client";

import { Loader2, Wand2 } from "lucide-react";
import type { Project, ProjectMatch } from "@/lib/types";
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
