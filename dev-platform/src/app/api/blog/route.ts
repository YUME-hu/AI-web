import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { computeExcerpt, computeReadingTime } from "@/lib/blog";
import { syncBlogPostEvent } from "@/lib/calendar";
import {
  buildBlogText,
  deleteSourceEmbeddings,
  syncSourceEmbeddings,
} from "@/lib/rag";
import type { BlogPost, BlogPostFormValues } from "@/lib/types";

// PostgREST 唯一约束冲突
const PG_UNIQUE_VIOLATION = "23505";

/**
 * GET /api/blog — 公开列表
 * query: category / tag；未登录只返回已发布；按 published_at desc
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin = await isAdmin();
  const sp = request.nextUrl.searchParams;

  let query = supabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, category, tags, is_published, published_at, reading_time, created_at",
    )
    .order("published_at", { ascending: false, nullsFirst: false });

  if (!admin) {
    query = query.eq("is_published", true);
  }
  const category = sp.get("category")?.trim();
  if (category) {
    query = query.eq("category", category);
  }
  const tag = sp.get("tag")?.trim();
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `查询失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ posts: data });
}

/** POST /api/blog — 创建文章（仅管理员）；excerpt / reading_time / published_at 服务端计算 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<BlogPostFormValues>;
  if (!body.title?.trim() || !body.slug?.trim() || !body.content?.trim()) {
    return NextResponse.json(
      { error: "标题、slug 与正文均不能为空" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: body.title.trim(),
      slug: body.slug.trim(),
      content: body.content,
      category: body.category ?? "tech_notes",
      tags: body.tags ?? [],
      linked_project_id: body.linked_project_id || null,
      is_published: body.is_published ?? false,
      excerpt: computeExcerpt(body.content),
      reading_time: computeReadingTime(body.content),
      published_at: body.is_published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "该 slug 已被占用，请更换" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: `创建失败：${error.message}` }, { status: 500 });
  }
  // 发布时同步日历事件（失败不阻塞主流程）
  if (data.is_published && data.published_at) {
    await syncBlogPostEvent(supabase, {
      id: data.id,
      title: data.title,
      published_at: data.published_at,
    }).catch((e) => console.error("日历事件同步失败", e));
  }
  // RAG 向量索引：仅发布文章索引，未发布则确保无残留（失败不阻塞主流程）
  if (data.is_published) {
    await syncSourceEmbeddings(
      "blog",
      data.id,
      buildBlogText(data as BlogPost),
    ).catch((e) => console.error("向量索引同步失败", e));
  } else {
    await deleteSourceEmbeddings("blog", data.id).catch((e) =>
      console.error("向量索引删除失败", e),
    );
  }
  return NextResponse.json({ post: data }, { status: 201 });
}
