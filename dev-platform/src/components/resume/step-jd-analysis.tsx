import { Briefcase, Clock3, KeySquare, ListChecks, Star } from "lucide-react";
import {
  SKILL_IMPORTANCE_LABELS,
  type Resume,
  type SkillImportance,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";

/** 技能重要度分色：high=琥珀、medium=青、low=灰 */
const IMPORTANCE_STYLE: Record<SkillImportance, string> = {
  high: "border-accent/50 bg-accent/10 text-accent",
  medium: "border-primary/50 bg-primary/10 text-primary",
  low: "border-border bg-muted text-muted-foreground",
};

const SECTION_TITLE =
  "flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase";

/** 步骤 1：JD 分析结果展示 */
export function StepJdAnalysis({ resume }: { resume: Resume }) {
  const analysis = resume.jd_analysis;

  if (!analysis) {
    return (
      <div className="border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">JD 分析数据缺失</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 岗位概览 */}
      <section className="clip-corner border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary" />
            <span className="text-lg font-bold">
              {analysis.title ?? resume.target_role ?? "目标岗位"}
            </span>
          </div>
          {resume.target_role && analysis.title !== resume.target_role && (
            <span className="font-mono text-xs text-muted-foreground">
              目标：{resume.target_role}
            </span>
          )}
          {analysis.requiredExperience && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              {analysis.requiredExperience}
            </span>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 技能要求 */}
        <section className="clip-corner border border-border bg-card p-5">
          <h3 className={SECTION_TITLE}>
            <ListChecks className="size-4" />
            技能要求
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.requiredSkills.map((s) => (
              <Badge
                key={s.skill}
                variant="outline"
                className={`rounded-sm font-mono ${IMPORTANCE_STYLE[s.importance]}`}
              >
                {s.skill} · {SKILL_IMPORTANCE_LABELS[s.importance]}
              </Badge>
            ))}
            {analysis.requiredSkills.length === 0 && (
              <p className="text-sm text-muted-foreground">未提取到技能要求</p>
            )}
          </div>
        </section>

        {/* 岗位职责 */}
        <section className="clip-corner border border-border bg-card p-5">
          <h3 className={SECTION_TITLE}>
            <ListChecks className="size-4" />
            岗位职责
          </h3>
          <ul className="mt-3 space-y-2">
            {analysis.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="font-mono text-primary">▸</span>
                {r}
              </li>
            ))}
            {analysis.responsibilities.length === 0 && (
              <p className="text-sm text-muted-foreground">未提取到岗位职责</p>
            )}
          </ul>
        </section>

        {/* 加分项 */}
        <section className="clip-corner border border-border bg-card p-5">
          <h3 className={SECTION_TITLE}>
            <Star className="size-4" />
            加分项
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.preferredSkills.map((s) => (
              <Badge key={s} variant="outline" className="rounded-sm font-mono">
                {s}
              </Badge>
            ))}
            {analysis.preferredSkills.length === 0 && (
              <p className="text-sm text-muted-foreground">无</p>
            )}
          </div>
        </section>

        {/* 关键词 */}
        <section className="clip-corner border border-border bg-card p-5">
          <h3 className={SECTION_TITLE}>
            <KeySquare className="size-4" />
            ATS 关键词
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.keywords.map((k) => (
              <Badge
                key={k}
                variant="secondary"
                className="rounded-sm font-mono"
              >
                # {k}
              </Badge>
            ))}
            {analysis.keywords.length === 0 && (
              <p className="text-sm text-muted-foreground">无</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
