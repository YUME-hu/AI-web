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

/** Phase 5 RAG 对话 system prompt（检索资料在调用时拼接于其后） */
export const RAG_CHAT_SYSTEM =
  "你是这个个人开发者平台上的 AI 助手，负责回答关于平台主人（一位开发者）的项目经历和技术能力的问题。基于以下检索到的资料回答，资料不足时诚实说明不知道，不要编造。回答使用中文，简洁专业。回答中提及具体项目或文章时，用【来源：标题】标注。";

/** Phase 7 项目推荐方案生成（技能缺口 → 练习项目） */
export const PROJECT_PLAN = {
  system:
    "你是一个技术项目顾问。用户需要补齐技能缺口，请推荐一个练习项目。只返回 JSON。",
  user: (skillGap: string, existingSkills: string[], targetRole: string) =>
    `技能缺口：${skillGap}\n用户现有技能：${existingSkills.join("、") || "无"}\n目标岗位：${targetRole}\n\n返回格式：{"name":"项目名称","description":"50字内简介","whyRecommended":"为什么推荐（对应哪些JD要求）","techStack":["技术1"],"features":["核心功能1"],"implementation":"实现思路与技术要点（100字内）","estimatedDays":14,"learningResources":[{"title":"资源名","url":"链接","type":"doc/video/course"}],"resumeValue":"完成后在简历中的描述方式（80字内）"}`,
} as const;

/* ==================== Phase 8：AI 面试教练 ==================== */

/** 面试题生成（岗位要求 + 项目经历 → 15 道题） */
export const INTERVIEW_QUESTIONS = {
  system:
    "你是一个资深技术面试官。请基于岗位要求和候选人项目经历生成面试题。只返回 JSON。",
  user: (jdAnalysis: unknown, projectsSummary: string) =>
    `岗位要求：${JSON.stringify(jdAnalysis)}\n\n候选人项目经历摘要：${projectsSummary}\n\n请生成 15 道面试题：技术题5道、项目题4道、系统设计3道、行为题3道。\n返回格式：[{"id":1,"category":"technical|project|system_design|behavioral","question":"题目","difficulty":2,"assessmentPoints":["考察点"],"referenceAnswer":"参考答案（结合候选人项目经历）","followUps":["追问1"],"linkedProjectId":"关联项目ID或null"}]`,
} as const;

/** 单题练习回答评估（STAR 法则） */
export const ANSWER_FEEDBACK = {
  system: "你是面试评估专家，按 STAR 法则评估候选人的回答。只返回 JSON。",
  user: (question: string, assessmentPoints: string[], answer: string) =>
    `题目：${question}\n考察点：${assessmentPoints.join("、")}\n候选人回答：${answer}\n\n返回格式：{"completeness":7,"technicalDepth":6,"structure":8,"overallScore":7,"feedback":"总体评价（2-3句）","suggestions":["改进建议1"],"starAnalysis":{"situation":"是否体现情境及简评","task":"...","action":"...","result":"..."}}，各分数 1-10`,
} as const;

/** 模拟面试 system prompt（模板函数替换岗位/项目摘要） */
export const MOCK_INTERVIEW_SYSTEM = (
  jdSummary: string,
  projectsSummary: string,
) =>
  `你是一个资深技术面试官，正在面试候选人应聘以下岗位。\n\n岗位要求：${jdSummary}\n候选人项目经历：${projectsSummary}\n\n面试规则：\n1. 每次只问一个问题，等候选人回答后再追问或进入下一题\n2. 先从项目经历切入，再逐步深入技术细节\n3. 根据候选人回答质量决定是否追问\n4. 追问时聚焦：技术深度、决策理由、遇到的挑战\n5. 如果候选人回答不完整，引导补充\n6. 面试共 8-10 轮对话\n7. 候选人回答后，先给出简短反馈（1-2句），再追问或换题\n\n请以面试官身份开始面试。第一句话要自然、友好。`;

/** 模拟面试评估报告 */
export const INTERVIEW_EVALUATION = {
  system: "你是面试评估专家。请根据模拟面试记录生成评估报告。只返回 JSON。",
  user: (conversation: unknown) =>
    `面试记录：${JSON.stringify(conversation)}\n\n返回格式：{"technicalDepth":7,"projectClarity":8,"communicationSkill":6,"problemSolving":7,"overallScore":7,"strengths":["优势1"],"weaknesses":["薄弱点1"],"suggestions":["改进建议1"]}，各维度 1-10`,
} as const;
