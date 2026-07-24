/**
 * Phase 8 AI 面试教练共享逻辑（纯函数）
 * prompt 摘要构建 + AI 返回归一化
 */
import { asStringArray } from "./resumes";
import type {
  AnswerFeedback,
  InterviewCategory,
  JdAnalysis,
  MockEvaluation,
  Project,
} from "./types";

export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  "technical",
  "project",
  "system_design",
  "behavioral",
];

type ProjectSummaryInput = Pick<
  Project,
  "id" | "title" | "description" | "tech_stack" | "features" | "highlights"
>;

/** 候选人项目经历摘要（供 prompt，带项目 ID 供 linkedProjectId 回填） */
export function buildProjectsSummary(projects: ProjectSummaryInput[]): string {
  if (projects.length === 0) return "（无项目记录）";
  return projects
    .map((p) => {
      const parts = [
        `- [${p.id}] ${p.title}（${p.tech_stack.join("/") || "技术栈未标注"}）`,
        p.description ?? "",
        p.features.length > 0 ? `功能：${p.features.join("；")}` : "",
        p.highlights.length > 0 ? `亮点：${p.highlights.join("；")}` : "",
      ];
      return parts.filter(Boolean).join("，");
    })
    .join("\n");
}

/** 岗位要求摘要（供 MOCK_INTERVIEW_SYSTEM 模板） */
export function buildJdSummary(
  jd: JdAnalysis | null,
  targetRole: string | null,
): string {
  if (!jd) return targetRole ?? "目标岗位";
  const skills = jd.requiredSkills
    .map((s) => `${s.skill}（${s.importance}）`)
    .join("、");
  return [
    jd.title ?? targetRole ?? "目标岗位",
    `经验要求：${jd.requiredExperience ?? "未知"}`,
    `技能要求：${skills || "见 JD"}`,
    jd.preferredSkills.length > 0 ? `加分项：${jd.preferredSkills.join("、")}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

/** 归一化后的面试题（insert 前形状，resume_id 由路由补充） */
export interface NormalizedQuestion {
  category: InterviewCategory;
  question: string;
  difficulty: number;
  assessment_points: string[];
  reference_answer: string | null;
  follow_ups: string[];
  linked_project_id: string | null;
}

/**
 * AI 面试题归一化
 * linkedProjectId 必须存在于项目表中，否则置 null
 */
export function normalizeInterviewQuestions(
  raw: unknown,
  validProjectIds: Set<string>,
): NormalizedQuestion[] {
  if (!Array.isArray(raw)) return [];
  const result: NormalizedQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    if (typeof q.question !== "string" || !q.question.trim()) continue;

    const category = INTERVIEW_CATEGORIES.includes(
      q.category as InterviewCategory,
    )
      ? (q.category as InterviewCategory)
      : "technical";
    const difficultyNum = Number(q.difficulty);
    const difficulty = [1, 2, 3].includes(difficultyNum) ? difficultyNum : 2;
    const linkedId =
      typeof q.linkedProjectId === "string" &&
      validProjectIds.has(q.linkedProjectId)
        ? q.linkedProjectId
        : null;

    result.push({
      category,
      question: q.question.trim(),
      difficulty,
      assessment_points: asStringArray(q.assessmentPoints),
      reference_answer:
        typeof q.referenceAnswer === "string" ? q.referenceAnswer : null,
      follow_ups: asStringArray(q.followUps),
      linked_project_id: linkedId,
    });
  }
  return result;
}

/** 分数收敛到 0-10（保留 1 位小数） */
function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

/** 单题反馈归一化 */
export function normalizeAnswerFeedback(
  raw: Partial<AnswerFeedback>,
): AnswerFeedback {
  const star = raw.starAnalysis;
  return {
    completeness: clampScore(raw.completeness),
    technicalDepth: clampScore(raw.technicalDepth),
    structure: clampScore(raw.structure),
    overallScore: clampScore(raw.overallScore),
    feedback: raw.feedback ?? "",
    suggestions: asStringArray(raw.suggestions),
    starAnalysis: {
      situation: star?.situation ?? "",
      task: star?.task ?? "",
      action: star?.action ?? "",
      result: star?.result ?? "",
    },
  };
}

/** 模拟面试评估报告归一化 */
export function normalizeMockEvaluation(
  raw: Partial<MockEvaluation>,
): MockEvaluation {
  return {
    technicalDepth: clampScore(raw.technicalDepth),
    projectClarity: clampScore(raw.projectClarity),
    communicationSkill: clampScore(raw.communicationSkill),
    problemSolving: clampScore(raw.problemSolving),
    overallScore: clampScore(raw.overallScore),
    strengths: asStringArray(raw.strengths),
    weaknesses: asStringArray(raw.weaknesses),
    suggestions: asStringArray(raw.suggestions),
  };
}
