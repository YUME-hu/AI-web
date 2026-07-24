/**
 * Phase 4 日历事件同步逻辑（服务端共享）
 * 自动事件由源数据驱动：项目 / 博客变更后调用对应 sync 函数
 * upsert 实现：表无唯一约束，按 (linked_id, event_type) 先删后插；日期为空则仅删除
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEventType } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface ReplaceLinkedEventParams {
  linkedColumn: "linked_project_id" | "linked_blog_id";
  linkedId: string;
  eventType: CalendarEventType;
  /** 为 null 时仅删除对应事件（日期被清空） */
  date: string | null;
  title: string;
  description?: string | null;
}

/** 先删后插模拟 upsert */
async function replaceLinkedEvent(
  supabase: AnySupabaseClient,
  params: ReplaceLinkedEventParams,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("calendar_events")
    .delete()
    .eq(params.linkedColumn, params.linkedId)
    .eq("event_type", params.eventType);
  if (deleteError) throw deleteError;

  if (!params.date) return;

  const { error: insertError } = await supabase
    .from("calendar_events")
    .insert({
      date: params.date,
      event_type: params.eventType,
      title: params.title,
      description: params.description ?? null,
      [params.linkedColumn]: params.linkedId,
    });
  if (insertError) throw insertError;
}

/** 项目创建/更新后同步 project_start / project_end 事件 */
export async function syncProjectEvents(
  supabase: AnySupabaseClient,
  project: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
  },
): Promise<void> {
  await replaceLinkedEvent(supabase, {
    linkedColumn: "linked_project_id",
    linkedId: project.id,
    eventType: "project_start",
    date: project.start_date,
    title: `🚀 ${project.title} 启动`,
  });
  await replaceLinkedEvent(supabase, {
    linkedColumn: "linked_project_id",
    linkedId: project.id,
    eventType: "project_end",
    date: project.end_date,
    title: `✅ ${project.title} 完成`,
  });
}

/** 删除项目的全部关联事件（删项目前必须调用，FK 无 cascade） */
export async function deleteProjectEvents(
  supabase: AnySupabaseClient,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("linked_project_id", projectId);
  if (error) throw error;
}

/**
 * 博客发布状态同步 blog_post 事件
 * published_at 为空（取消发布）时仅删除对应事件；标题/日期变化时覆盖更新
 */
export async function syncBlogPostEvent(
  supabase: AnySupabaseClient,
  post: { id: string; title: string; published_at: string | null },
): Promise<void> {
  await replaceLinkedEvent(supabase, {
    linkedColumn: "linked_blog_id",
    linkedId: post.id,
    eventType: "blog_post",
    date: post.published_at?.slice(0, 10) ?? null,
    title: `📝 ${post.title}`,
  });
}

/** 删除文章的全部关联事件（删文章前必须调用，FK 无 cascade） */
export async function deleteBlogPostEvents(
  supabase: AnySupabaseClient,
  blogId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("linked_blog_id", blogId);
  if (error) throw error;
}
