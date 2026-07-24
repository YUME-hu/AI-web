/**
 * 项目库服务端共享逻辑：查询构建、表单值归一化
 * 仅供 Server Components / Route Handlers 使用
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectFormValues } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface ProjectQueryParams {
  q?: string;
  tech?: string;
  tag?: string;
  status?: string;
  from?: string;
  to?: string;
}

/** YYYY-MM → YYYY-MM-01（date 列需要完整日期）；非法输入返回 null */
export function toDate(ym: string | null | undefined): string | null {
  if (!ym) return null;
  const trimmed = ym.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

/** 项目列表查询（项目列表页与 GET /api/projects 共用） */
export async function queryProjects(
  supabase: AnySupabaseClient,
  params: ProjectQueryParams,
  /** 访客视角：只返回已发布项目 */
  publishedOnly: boolean,
): Promise<{ projects: Project[]; error: string | null }> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (publishedOnly) {
    query = query.eq("is_published", true);
  }

  const q = params.q?.trim();
  if (q) {
    // 剔除会破坏 PostgREST or() 语法的字符
    const safe = q.replace(/[%(),."\\]/g, " ");
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  const tech = params.tech?.trim();
  if (tech) {
    query = query.contains("tech_stack", [tech]);
  }
  const tag = params.tag?.trim();
  if (tag) {
    query = query.contains("tags", [tag]);
  }
  const status = params.status?.trim();
  if (status) {
    query = query.eq("status", status);
  }
  const from = toDate(params.from);
  if (from) {
    query = query.gte("start_date", from);
  }
  const to = toDate(params.to);
  if (to) {
    query = query.lte("start_date", to);
  }

  const { data, error } = await query;
  return {
    projects: (data ?? []) as Project[],
    error: error?.message ?? null,
  };
}

/** 表单值 → 数据库行（仅包含 body 中出现的字段，POST / PATCH 共用） */
export function normalizeProjectInput(
  body: Partial<ProjectFormValues>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (body.title !== undefined) row.title = body.title.trim();
  if (body.description !== undefined)
    row.description = body.description.trim() || null;
  if (body.tech_stack !== undefined) row.tech_stack = body.tech_stack;
  if (body.tags !== undefined) row.tags = body.tags;
  if (body.features !== undefined) row.features = body.features;
  if (body.highlights !== undefined) row.highlights = body.highlights;
  if (body.role !== undefined) row.role = body.role.trim() || null;
  if (body.repo_url !== undefined) row.repo_url = body.repo_url.trim() || null;
  if (body.demo_url !== undefined) row.demo_url = body.demo_url.trim() || null;
  if (body.status !== undefined) row.status = body.status;
  if (body.start_date !== undefined) row.start_date = toDate(body.start_date);
  if (body.end_date !== undefined) row.end_date = toDate(body.end_date);
  if (body.readme_content !== undefined)
    row.readme_content = body.readme_content || null;
  if (body.cover_image !== undefined)
    row.cover_image = body.cover_image || null;
  if (body.is_published !== undefined) row.is_published = body.is_published;
  return row;
}
