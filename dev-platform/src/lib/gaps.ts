/**
 * Phase 7 技能缺口分析共享逻辑（纯函数）
 * 缺口计算是确定性的（不调 AI）：JD 要求技能 vs 项目库技术栈并集
 */
import { asStringArray } from "./resumes";
import type {
  JdAnalysis,
  Project,
  ProjectPlan,
  SkillGap,
} from "./types";

const IMPORTANCE_RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * 确定性技能缺口计算：
 * JD requiredSkills（high/medium）逐个 vs 项目库 tech_stack 做大小写不敏感匹配
 * 0 个项目覆盖 → missing；仅 1 个 → weak
 * 排序：missing 优先，同级按 JD 重要度 high 优先
 */
export function computeSkillGaps(
  jdAnalysis: JdAnalysis | null,
  projects: Pick<Project, "title" | "tech_stack">[],
): SkillGap[] {
  if (!jdAnalysis) return [];
  const required = jdAnalysis.requiredSkills.filter(
    (s) => s.importance === "high" || s.importance === "medium",
  );

  const gaps: SkillGap[] = [];
  for (const { skill } of required) {
    const needle = skill.toLowerCase();
    const coveredBy = projects
      .filter((p) => p.tech_stack.some((t) => t.toLowerCase() === needle))
      .map((p) => p.title);
    if (coveredBy.length === 0) {
      gaps.push({ skill, coverage: "missing", coveredBy });
    } else if (coveredBy.length === 1) {
      gaps.push({ skill, coverage: "weak", coveredBy });
    }
  }

  return gaps.sort((a, b) => {
    if (a.coverage !== b.coverage) return a.coverage === "missing" ? -1 : 1;
    const ia =
      required.find((s) => s.skill === a.skill)?.importance ?? "low";
    const ib =
      required.find((s) => s.skill === b.skill)?.importance ?? "low";
    return IMPORTANCE_RANK[ia] - IMPORTANCE_RANK[ib];
  });
}

/** 项目库技术栈并集（保留原始大小写，按小写去重） */
export function unionTechStack(
  projects: Pick<Project, "tech_stack">[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of projects) {
    for (const t of p.tech_stack) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(t);
      }
    }
  }
  return result;
}

/** AI 项目方案归一化（容错非数组/缺字段） */
export function normalizeProjectPlan(
  raw: Partial<ProjectPlan>,
  skillGap: string,
): ProjectPlan {
  const resources = Array.isArray(raw.learningResources)
    ? raw.learningResources
        .filter((r) => !!r && typeof r.title === "string" && typeof r.url === "string")
        .map((r) => ({ title: r.title, url: r.url, type: r.type ?? "doc" }))
    : [];
  const days = Number(raw.estimatedDays);
  return {
    name: raw.name?.trim() || `${skillGap} 练习项目`,
    description: raw.description ?? "",
    whyRecommended: raw.whyRecommended ?? "",
    techStack: asStringArray(raw.techStack),
    features: asStringArray(raw.features),
    implementation: raw.implementation ?? "",
    estimatedDays: Number.isFinite(days) && days > 0 ? Math.round(days) : 14,
    learningResources: resources,
    resumeValue: raw.resumeValue ?? "",
  };
}
