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
