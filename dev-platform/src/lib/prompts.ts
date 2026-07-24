/**
 * Phase 2 简历生成器 AI Prompt 常量
 * 所有 DeepSeek 调用使用 JSON 模式（chatCompletionJson）
 */

export const JD_ANALYSIS = {
  system: "你是一个资深技术招聘专家。请分析用户提供的岗位描述。只返回 JSON。",
  user: (jdContent: string) =>
    `请分析以下岗位描述：\n\n${jdContent}\n\n返回格式：{"title":"岗位名称","requiredSkills":[{"skill":"技能名","importance":"high/medium/low"}],"requiredExperience":"经验要求（如3-5年）","responsibilities":["职责1"],"preferredSkills":["加分项1"],"keywords":["关键词1"]}`,
} as const;

export const PROJECT_MATCH = {
  system:
    "你是一个技术简历顾问。请根据岗位要求，对用户提供的项目列表进行匹配度评分。只返回 JSON。",
  user: (jdAnalysis: unknown, projects: unknown) =>
    `岗位分析：${JSON.stringify(jdAnalysis)}\n\n项目列表：${JSON.stringify(projects)}\n\n返回格式：[{"projectId":"项目ID","score":85,"reason":"评分理由","relevantSkills":["React"],"suggestedDescription":"针对该岗位优化的项目描述（80-120字，突出相关技能和量化成果）"}]，按 score 降序`,
} as const;

export const RESUME_EVALUATE = {
  system: "你是一个简历审查专家。请评估生成的简历项目描述的质量。只返回 JSON。",
  user: (jobSummary: string, descriptions: unknown) =>
    `岗位摘要：${jobSummary}\n\n项目描述列表：${JSON.stringify(descriptions)}\n\n返回格式：[{"projectId":"项目ID","clarityScore":8,"relevanceScore":9,"quantificationScore":6,"overallScore":7.5,"suggestions":["建议1"]}]`,
} as const;
