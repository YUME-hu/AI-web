import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { computeExcerpt, computeReadingTime } from "@/lib/blog";
import { deleteBlogPostEvents, syncBlogPostEvent } from "@/lib/calendar";
import {
  buildBlogText,
  deleteSourceEmbeddings,
  syncSourceEmbeddings,
} from "@/lib/rag";
import type { BlogPost, BlogPostFormValues } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

const PG_UNIQUE_VIOLATION = "23505";

/** GET /api/blog/[id] — 按 id 取详情（仅管理员，编辑回显用） */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }
  return NextResponse.json({ post: data });
}

/**
 * PATCH /api/blog/[id] — 更新文章（仅管理员）
 * 正文变化时重算 excerpt / reading_time；is_published 从 false→true 时写入 published_at
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<BlogPostFormValues>;
  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }
  if (body.slug !== undefined && !body.slug.trim()) {
    return NextResponse.json({ error: "slug 不能为空" }, { status: 400 });
  }

  const supabase = await createClient();
  // 需要既有行判断发布状态流转
  const { data: existing, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, is_published, published_at")
    .eq("id", id)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.slug !== undefined) updates.slug = body.slug.trim();
  if (body.category !== undefined) updates.category = body.category;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.linked_project_id !== undefined)
    updates.linked_project_id = body.linked_project_id || null;
  if (body.content !== undefined) {
    updates.content = body.content;
    updates.excerpt = computeExcerpt(body.content);
    updates.reading_time = computeReadingTime(body.content);
  }
  if (body.is_published !== undefined) {
    updates.is_published = body.is_published;
    // 从未发布 → 发布：写入发布时间
    if (body.is_published && !existing.is_published) {
      updates.published_at = new Date().toISOString();
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "该 slug 已被占用，请更换" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
  }
  // 日历事件同步：发布 → upsert（含标题/日期变化）；取消发布 → 删除（失败不阻塞主流程）
  const updated = data as BlogPost;
  if (updated.is_published && updated.published_at) {
    await syncBlogPostEvent(supabase, {
      id: updated.id,
      title: updated.title,
      published_at: updated.published_at,
    }).catch((e) => console.error("日历事件同步失败", e));
  } else {
    await deleteBlogPostEvents(supabase, id).catch((e) =>
      console.error("日历事件删除失败", e),
    );
  }
  // RAG 向量索引：仅发布文章索引，未发布则删除（失败不阻塞主流程）
  if (updated.is_published) {
    await syncSourceEmbeddings(
      "blog",
      updated.id,
      buildBlogText(updated),
    ).catch((e) => console.error("向量索引同步失败", e));
  } else {
    await deleteSourceEmbeddings("blog", id).catch((e) =>
      console.error("向量索引删除失败", e),
    );
  }
  return NextResponse.json({ post: updated });
}

/** DELETE /api/blog/[id] — 删除文章（仅管理员） */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  // 先删关联日历事件（FK 无 cascade，不删会导致文章删除报错）
  await deleteBlogPostEvents(supabase, id).catch((e) =>
    console.error("日历事件删除失败", e),
  );
  // 删除 RAG 向量索引（失败不阻塞主流程）
  await deleteSourceEmbeddings("blog", id).catch((e) =>
    console.error("向量索引删除失败", e),
  );
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: `删除失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
