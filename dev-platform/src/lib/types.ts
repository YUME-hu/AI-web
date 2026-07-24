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
