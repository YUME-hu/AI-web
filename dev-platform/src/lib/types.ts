/**
 * 项目库领域类型（对应 Supabase projects 表）
 */

export type ProjectStatus = "planned" | "in_progress" | "completed" | "archived";

/** 项目记录（与 projects 表字段一一对应） */
export interface Project {
  id: string;
  title: string;
  description: string | null;
  tech_stack: string[];
  tags: string[];
  features: string[];
  highlights: string[];
  role: string | null;
  repo_url: string | null;
  demo_url: string | null;
  status: ProjectStatus;
  /** date 列，格式 YYYY-MM-DD */
  start_date: string | null;
  end_date: string | null;
  readme_content: string | null;
  cover_image: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** 项目表单值：日期为 YYYY-MM（<input type="month">），入库时由 API 拼 -01 */
export interface ProjectFormValues {
  title: string;
  description: string;
  tech_stack: string[];
  tags: string[];
  features: string[];
  highlights: string[];
  role: string;
  repo_url: string;
  demo_url: string;
  status: ProjectStatus;
  /** YYYY-MM，空串表示未设置 */
  start_date: string;
  end_date: string;
  readme_content: string;
  cover_image: string;
  is_published: boolean;
}

/** AI README 解析结果（不落库，用户确认后再走 POST /api/projects） */
export interface ProjectParseResult {
  name: string | null;
  description: string | null;
  techStack: string[];
  features: string[];
  highlights: string[];
  role: string | null;
  /** YYYY-MM，可空 */
  startDate: string | null;
  endDate: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "计划中",
  in_progress: "进行中",
  completed: "已完成",
  archived: "已归档",
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];


/* ==================== Phase 2：智能简历生成器 ==================== */

export type SkillImportance = "high" | "medium" | "low";

/** JD 分析结果（jd_analysis jsonb） */
export interface JdAnalysis {
  title: string | null;
  requiredSkills: { skill: string; importance: SkillImportance }[];
  requiredExperience: string | null;
  responsibilities: string[];
  preferredSkills: string[];
  keywords: string[];
}

/** 单个项目的岗位匹配结果（generated_content.matches 元素） */
export interface ProjectMatch {
  projectId: string;
  score: number;
  reason: string;
  relevantSkills: string[];
  suggestedDescription: string;
}

/** AI 自评结果（ai_evaluation jsonb 元素） */
export interface ResumeEvaluation {
  projectId: string;
  clarityScore: number;
  relevanceScore: number;
  quantificationScore: number;
  overallScore: number;
  suggestions: string[];
}

/** 简历头部个人信息（generated_content.profile） */
export interface ResumeProfile {
  name: string;
  title: string;
  email: string;
  github: string;
  website: string;
}

/** generated_content jsonb 结构约定 */
export interface ResumeGeneratedContent {
  profile: ResumeProfile;
  matches: ProjectMatch[];
  /** projectId → 最终用于简历的描述（用户可在 AI 建议基础上修改） */
  finalDescriptions: Record<string, string>;
  /** 已勾选项目的展示顺序 */
  projectOrder: string[];
}

/** user_modifications jsonb：仅记录 AI 原文与用户最终稿有差异的条目 */
export type ResumeUserModifications = Record<string, { ai: string; user: string }>;

/** 简历记录（对应 Supabase resumes 表） */
export interface Resume {
  id: string;
  target_role: string | null;
  jd_content: string | null;
  jd_analysis: JdAnalysis | null;
  selected_project_ids: string[];
  generated_content: ResumeGeneratedContent | null;
  ai_evaluation: ResumeEvaluation[] | null;
  user_modifications: ResumeUserModifications | null;
  version: number;
  created_at: string;
}

export const EMPTY_RESUME_PROFILE: ResumeProfile = {
  name: "",
  title: "",
  email: "",
  github: "",
  website: "",
};

export const SKILL_IMPORTANCE_LABELS: Record<SkillImportance, string> = {
  high: "必备",
  medium: "重要",
  low: "了解",
};


/* ==================== Phase 3：博客系统 ==================== */

export type BlogCategory = "ideas" | "life" | "tech_notes";

/** 博客文章（对应 Supabase blog_posts 表） */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  /** Markdown 原文 */
  content: string;
  excerpt: string | null;
  category: BlogCategory;
  tags: string[];
  cover_image: string | null;
  linked_project_id: string | null;
  is_published: boolean;
  published_at: string | null;
  /** 分钟 */
  reading_time: number | null;
  created_at: string;
  updated_at: string;
}

/** 博客编辑表单值 */
export interface BlogPostFormValues {
  title: string;
  slug: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  /** 空串表示无关联项目 */
  linked_project_id: string;
  is_published: boolean;
}

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  ideas: "想法",
  life: "生活",
  tech_notes: "技术笔记",
};

export const BLOG_CATEGORIES = Object.keys(BLOG_CATEGORY_LABELS) as BlogCategory[];


/* ==================== Phase 4：开发日历 ==================== */

export type CalendarEventType =
  | "project_start"
  | "project_end"
  | "commit"
  | "release"
  | "blog_post"
  | "manual";

/** 日历事件（对应 Supabase calendar_events 表） */
export interface CalendarEvent {
  id: string;
  /** date 列，格式 YYYY-MM-DD */
  date: string;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
  linked_project_id: string | null;
  linked_blog_id: string | null;
  created_at: string;
}

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  project_start: "项目启动",
  project_end: "项目完成",
  commit: "代码提交",
  release: "版本发布",
  blog_post: "文章发布",
  manual: "手动记录",
};


/* ==================== Phase 5：AI 知识助手（RAG） ==================== */

/** 对话来源引用（chat_sessions.sources jsonb / SSE sources 帧） */
export interface RagSource {
  type: "project" | "blog";
  title: string;
  url: string;
}

/** 语义搜索结果项 */
export interface SearchResult {
  sourceType: "project" | "blog";
  sourceId: string;
  title: string;
  similarity: number;
  /** chunk_text 前 120 字 */
  snippet: string;
  url: string;
}


/* ==================== Phase 6：Token 监控 ==================== */

export type AiModule =
  | "resume"
  | "knowledge"
  | "project_import"
  | "interview"
  | "project_generator"
  | "blog_assistant";

export const AI_MODULE_LABELS: Record<AiModule, string> = {
  resume: "简历生成",
  knowledge: "AI 问答",
  project_import: "项目导入",
  interview: "面试教练",
  project_generator: "项目生成",
  blog_assistant: "博客助手",
};

export interface UsageSummary {
  tokens: number;
  cost: number;
  calls: number;
}

export interface UsageDailyPoint {
  /** YYYY-MM-DD */
  date: string;
  tokens: number;
  cost: number;
}

export interface UsageModulePoint {
  module: string;
  tokens: number;
  cost: number;
  calls: number;
}

export interface UsageLogItem {
  module: string;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number | null;
  model: string | null;
  created_at: string;
}

export interface UsageStats {
  today: UsageSummary;
  /** 近 7 天（含今天） */
  week: UsageSummary;
  /** 近 30 天（含今天） */
  month: UsageSummary;
  /** 近 30 天每天（补零日期） */
  daily: UsageDailyPoint[];
  /** 近 30 天各模块 */
  byModule: UsageModulePoint[];
  /** 最近 50 条日志 */
  recent: UsageLogItem[];
  dailyLimit: { limit: number; used: number };
}


/* ==================== Phase 7：AI 项目生成器 ==================== */

export type RecommendedStatus = "saved" | "started" | "completed";

export interface LearningResource {
  title: string;
  url: string;
  /** doc / video / course */
  type: string;
}

/** AI 生成的项目方案（recommended_projects.project_plan jsonb） */
export interface ProjectPlan {
  name: string;
  description: string;
  whyRecommended: string;
  techStack: string[];
  features: string[];
  implementation: string;
  estimatedDays: number;
  learningResources: LearningResource[];
  resumeValue: string;
}

/** 推荐项目记录（对应 recommended_projects 表） */
export interface RecommendedProject {
  id: string;
  resume_id: string;
  skill_gap: string;
  project_plan: ProjectPlan;
  status: RecommendedStatus;
  converted_project_id: string | null;
  created_at: string;
}

/** 列表展示用：附带简历目标岗位 */
export interface RecommendedProjectWithRole extends RecommendedProject {
  target_role?: string | null;
}

/** 代码层确定性缺口计算结果 */
export interface SkillGap {
  skill: string;
  /** missing=完全缺失（0 个项目覆盖）；weak=覆盖不足（仅 1 个） */
  coverage: "missing" | "weak";
  /** 覆盖该技能的项目标题 */
  coveredBy: string[];
}

export const RECOMMENDED_STATUS_LABELS: Record<RecommendedStatus, string> = {
  saved: "已保存",
  started: "进行中",
  completed: "已完成",
};


/* ==================== Phase 8：AI 面试教练 ==================== */

export type InterviewCategory =
  | "technical"
  | "project"
  | "system_design"
  | "behavioral";

export type InterviewQuestionStatus = "new" | "practiced" | "mastered";

/** STAR 法则分析（ai_feedback.starAnalysis） */
export interface StarAnalysis {
  situation: string;
  task: string;
  action: string;
  result: string;
}

/** 单题回答的 AI 反馈（interview_questions.ai_feedback jsonb） */
export interface AnswerFeedback {
  completeness: number;
  technicalDepth: number;
  structure: number;
  overallScore: number;
  feedback: string;
  suggestions: string[];
  starAnalysis: StarAnalysis;
}

/** 面试题（对应 interview_questions 表） */
export interface InterviewQuestion {
  id: string;
  resume_id: string;
  category: InterviewCategory;
  question: string;
  /** 1-3 */
  difficulty: number;
  assessment_points: string[];
  reference_answer: string | null;
  follow_ups: string[];
  linked_project_id: string | null;
  user_answer: string | null;
  ai_feedback: AnswerFeedback | null;
  status: InterviewQuestionStatus;
  created_at: string;
}

/** 模拟面试对话消息（mock_interviews.conversation jsonb 元素） */
export interface MockMessage {
  role: "interviewer" | "candidate";
  content: string;
  ts: string;
}

/** 模拟面试评估报告（mock_interviews.evaluation jsonb） */
export interface MockEvaluation {
  technicalDepth: number;
  projectClarity: number;
  communicationSkill: number;
  problemSolving: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

/** 模拟面试记录（对应 mock_interviews 表） */
export interface MockInterview {
  id: string;
  resume_id: string;
  conversation: MockMessage[];
  evaluation: MockEvaluation | null;
  started_at: string;
  completed_at: string | null;
}

export const INTERVIEW_CATEGORY_LABELS: Record<InterviewCategory, string> = {
  technical: "技术",
  project: "项目",
  system_design: "系统设计",
  behavioral: "行为",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewQuestionStatus, string> = {
  new: "未练习",
  practiced: "已练习",
  mastered: "已掌握",
};


/* ==================== Phase 9：个人信息（单行 profile 表） ==================== */

/** 个人信息（对应 profile 表，单行 id=1；与简历 generated_content.profile 独立） */
export interface Profile {
  id: number;
  name: string | null;
  title: string | null;
  bio: string | null;
  email: string | null;
  github: string | null;
  website: string | null;
  skills: string[];
  avatar_url: string | null;
  updated_at: string;
}

/** 个人信息表单值 */
export interface ProfileFormValues {
  name: string;
  title: string;
  bio: string;
  email: string;
  github: string;
  website: string;
  skills: string[];
  avatar_url: string;
}
