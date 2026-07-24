"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";
import type { Project, ResumeEvaluation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function scoreClass(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-accent";
  return "text-destructive";
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2 py-0.5 font-mono text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold", scoreClass(value))}>{value}</span>
    </span>
  );
}

interface StepEvaluateProps {
  evaluation: ResumeEvaluation[] | null;
  evaluating: boolean;
  selectedCount: number;
  onEvaluate: () => void;
  projectById: Map<string, Project>;
}

/** 步骤 3：AI 自评 — 清晰度 / 相关度 / 量化度 / 综合分 + 改进建议 */
export function StepEvaluate({
  evaluation,
  evaluating,
  selectedCount,
  onEvaluate,
  projectById,
}: StepEvaluateProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {evaluation
            ? "评估完成，可根据建议返回上一步修改描述后重新评估"
            : `将对当前勾选的 ${selectedCount} 个项目描述进行质量评估`}
        </p>
        <Button
          onClick={onEvaluate}
          disabled={evaluating || selectedCount === 0}
          className="rounded-sm"
        >
          {evaluating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ClipboardCheck className="size-4" />
          )}
          {evaluating ? "评估中…" : evaluation ? "重新评估" : "AI 自评"}
        </Button>
      </div>

      {!evaluation && !evaluating && (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO EVALUATION"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedCount > 0
              ? "点击「AI 自评」检查描述质量"
              : "请先在上一步勾选项目"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {evaluation?.map((item) => (
          <section
            key={item.projectId}
            className="clip-corner border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">
                {projectById.get(item.projectId)?.title ?? "未知项目"}
              </h3>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <ScoreChip label="清晰度" value={item.clarityScore} />
                <ScoreChip label="相关度" value={item.relevanceScore} />
                <ScoreChip label="量化度" value={item.quantificationScore} />
                <ScoreChip label="综合" value={item.overallScore} />
              </div>
            </div>
            {item.suggestions.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {item.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-accent">▸</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
