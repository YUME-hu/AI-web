import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, Clock3, FolderKanban } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { BLOG_CATEGORY_STYLES } from "@/lib/blog";
import {
  BLOG_CATEGORY_LABELS,
  type BlogPost,
  type Project,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/blog/markdown-content";

// ISR：每小时重新生成；generateStaticParams 预渲染全部已发布文章
export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

/**
 * 用 Service 客户端取数（不依赖 cookies，保证 SSG/ISR 可用）
 * 注意：service role 绕过 RLS，公开渲染必须显式过滤 is_published
 * 失败返回 null（构建期无 env 时不阻塞构建，运行时走 ISR 按需生成）
 */
async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    return (data as BlogPost | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("is_published", true);
    return (data ?? []).map((p) => ({ slug: p.slug as string }));
  } catch {
    // 构建环境未配置 Supabase 时跳过预渲染，运行时由 ISR 按需生成
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "文章" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.published_at ?? undefined,
      tags: post.tags,
    },
  };
}

async function getLinkedProject(projectId: string): Promise<Project | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("is_published", true)
      .single();
    return (data as Project | null) ?? null;
  } catch {
    return null;
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  // 未发布 / 不存在一律 404（草稿预览走编辑器页，公开路由保持 SSG）
  if (!post) notFound();

  const linkedProject = post.linked_project_id
    ? await getLinkedProject(post.linked_project_id)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* 头部 */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("rounded-sm", BLOG_CATEGORY_STYLES[post.category])}
          >
            {BLOG_CATEGORY_LABELS[post.category]}
          </Badge>
          {post.tags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="rounded-sm font-mono text-[10px]"
            >
              # {t}
            </Badge>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.title}</h1>
        <div className="mt-3 flex items-center gap-4 font-mono text-xs text-muted-foreground">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {post.published_at.slice(0, 10)}
            </span>
          )}
          {post.reading_time && (
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              约 {post.reading_time} 分钟
            </span>
          )}
        </div>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 正文 */}
      <MarkdownContent content={post.content} />

      {/* 关联项目 */}
      {linkedProject && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <FolderKanban className="size-4" />
            关联项目
          </h2>
          <Link
            href={`/projects/${linkedProject.id}`}
            className="clip-corner group mt-3 flex items-center gap-4 border border-border bg-card p-4 transition-colors hover:border-primary/60"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold transition-colors group-hover:text-primary">
                {linkedProject.title}
              </p>
              {linkedProject.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {linkedProject.description}
                </p>
              )}
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        </section>
      )}
    </div>
  );
}
