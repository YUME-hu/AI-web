/**
 * Phase 2 简历生成器共享逻辑（纯函数，客户端/服务端均可用）
 * AI 返回结果的容错归一化 + user_modifications 差异计算
 */
import type {
  JdAnalysis,
  ProjectMatch,
  ResumeEvaluation,
  ResumeGeneratedContent,
  ResumeUserModifications,
  SkillImportance,
} from "./types";
import { EMPTY_RESUME_PROFILE } from "./types";

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function asImportance(value: unknown): SkillImportance {
  // 容错：模型可能返回中文或大小写变体
  const v = String(value ?? "").toLowerCase();
  if (v === "high" || v === "高") return "high";
  if (v === "low" || v === "低") return "low";
  return "medium";
}

/** JD 分析结果归一化，避免模型返回结构偏差导致页面异常 */
export function normalizeJdAnalysis(raw: Partial<JdAnalysis>): JdAnalysis {
  const skills = Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [];
  return {
    title: asString(raw.title),
    requiredSkills: skills
      .filter((s) => s && typeof s.skill === "string")
      .map((s) => ({ skill: s.skill, importance: asImportance(s.importance) })),
    requiredExperience: asString(raw.requiredExperience),
    responsibilities: asStringArray(raw.responsibilities),
    preferredSkills: asStringArray(raw.preferredSkills),
    keywords: asStringArray(raw.keywords),
  };
}

/** 匹配结果归一化：过滤无效项目 ID、分数收敛到 0-100、按分数降序 */
export function normalizeMatches(
  raw: unknown,
  validProjectIds: Set<string>,
): ProjectMatch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is Partial<ProjectMatch> & { projectId: string } =>
        !!m && typeof m.projectId === "string" && validProjectIds.has(m.projectId),
    )
    .map((m) => ({
      projectId: m.projectId,
      score: Math.max(0, Math.min(100, Math.round(asNumber(m.score)))),
      reason: asString(m.reason) ?? "",
      relevantSkills: asStringArray(m.relevantSkills),
      suggestedDescription: asString(m.suggestedDescription) ?? "",
    }))
    .sort((a, b) => b.score - a.score);
}

/** AI 自评结果归一化 */
export function normalizeEvaluations(raw: unknown): ResumeEvaluation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Partial<ResumeEvaluation> & { projectId: string } =>
      !!e && typeof e.projectId === "string",
    )
    .map((e) => ({
      projectId: e.projectId,
      clarityScore: asNumber(e.clarityScore),
      relevanceScore: asNumber(e.relevanceScore),
      quantificationScore: asNumber(e.quantificationScore),
      overallScore: asNumber(e.overallScore),
      suggestions: asStringArray(e.suggestions),
    }));
}

/** 合并 generated_content（DB 中可能为 null 或缺字段） */
export function mergeGeneratedContent(
  existing: Partial<ResumeGeneratedContent> | null,
  patch: Partial<ResumeGeneratedContent>,
): ResumeGeneratedContent {
  return {
    profile: { ...EMPTY_RESUME_PROFILE, ...existing?.profile, ...patch.profile },
    matches: patch.matches ?? existing?.matches ?? [],
    finalDescriptions: {
      ...existing?.finalDescriptions,
      ...patch.finalDescriptions,
    },
    projectOrder: patch.projectOrder ?? existing?.projectOrder ?? [],
  };
}

/**
 * 计算 user_modifications：AI 建议原文 vs 用户最终稿，仅记录有差异的
 */
export function computeUserModifications(
  matches: ProjectMatch[],
  finalDescriptions: Record<string, string>,
): ResumeUserModifications {
  const mods: ResumeUserModifications = {};
  for (const match of matches) {
    const userText = finalDescriptions[match.projectId];
    if (
      userText !== undefined &&
      userText.trim() !== match.suggestedDescription.trim()
    ) {
      mods[match.projectId] = { ai: match.suggestedDescription, user: userText };
    }
  }
  return mods;
}
