import Link from "next/link";
import { CalendarDays, Clock3, PenLine, Pencil } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { BLOG_CATEGORY_STYLES } from "@/lib/blog";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  type BlogCategory,
  type BlogPost,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "博客" };

function firstString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatDate(post: BlogPost): string {
  return (post.published_at ?? post.created_at).slice(0, 10);
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const category = firstString(sp.category) as BlogCategory | "";
  const tag = firstString(sp.tag);

  const supabase = await createClient();
  const user = await getUser();

  // 先按分类取全集（用于派生标签 chips），标签筛选在内存中做
  let query = supabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, category, tags, is_published, published_at, reading_time, created_at",
    )
    .order("published_at", { ascending: false, nullsFirst: false });
  if (!user) {
    query = query.eq("is_published", true);
  }
  if (category) {
    query = query.eq("category", category);
  }
  const { data } = await query;
  const allInCategory = (data ?? []) as BlogPost[];
  const allTags = [...new Set(allInCategory.flatMap((p) => p.tags))];
  const posts = tag
    ? allInCategory.filter((p) => p.tags.includes(tag))
    : allInCategory;

  /** 生成保持另一筛选参数的链接 */
  function buildHref(next: { category?: string; tag?: string }) {
    const c = next.category !== undefined ? next.category : category;
    const t = next.tag !== undefined ? next.tag : tag;
    const params = new URLSearchParams();
    if (c) params.set("category", c);
    if (t) params.set("tag", t);
    const qs = params.toString();
    return qs ? `/blog?${qs}` : "/blog";
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-foreground">
            {"// BLOG FEED"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">博客</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {posts.length} 篇文章
          </p>
        </div>
        {user && (
          <Link
            href="/blog/new"
            className="flex items-center gap-1.5 border border-foreground bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-none hover:bg-foreground hover:text-background"
          >
            <PenLine className="size-3.5" />
            写博客
          </Link>
        )}
      </section>

      <div className="divider-tactical" />

      {/* 分类 tab */}
      <nav className="flex border-b border-border">
        <Link
          href={buildHref({ category: "" })}
          className={cn(
            "border-b-2 px-4 py-2.5 font-mono text-xs transition-colors",
            !category
              ? "border-foreground bg-foreground text-background"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          全部
        </Link>
        {BLOG_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={buildHref({ category: c })}
            className={cn(
              "border-b-2 px-4 py-2.5 font-mono text-xs transition-colors",
              category === c
                ? "border-foreground bg-foreground text-background"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {BLOG_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>

      {/* 标签 chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            TAGS //
          </span>
          {allTags.map((t) => (
            <Link
              key={t}
              href={buildHref({ tag: tag === t ? "" : t })}
              className={cn(
                "rounded-sm border px-2 py-0.5 font-mono text-[11px] transition-colors",
                tag === t
                  ? "border-chart-orange/60 bg-chart-orange/10 text-chart-orange"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              # {t}
            </Link>
          ))}
        </div>
      )}

      {/* 文章卡片列表 */}
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="card-hazard rivet group relative border border-foreground bg-card p-5 transition-colors hover:border-foreground"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("rounded-sm", BLOG_CATEGORY_STYLES[post.category])}
                  >
                    {BLOG_CATEGORY_LABELS[post.category]}
                  </Badge>
                  {!post.is_published && (
                    <Badge
                      variant="outline"
                      className="rounded-sm border-destructive/50 bg-destructive/10 text-destructive"
                    >
                      草稿
                    </Badge>
                  )}
                  <span className="ml-auto flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDate(post)}
                    </span>
                    {post.reading_time && (
                      <span className="flex items-center gap-1">
                        <Clock3 className="size-3" />
                        {post.reading_time} 分钟
                      </span>
                    )}
                  </span>
                </div>

                <h2 className="mt-2.5 text-lg font-bold transition-colors group-hover:text-chart-blue">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}

                {post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] text-muted-foreground"
                      >
                        # {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              {user && (
                <Link
                  href={`/blog/edit/${post.id}`}
                  className="absolute right-4 bottom-4 flex items-center gap-1 font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-chart-blue"
                >
                  <Pencil className="size-3" />
                  编辑
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO DATA"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {category || tag
              ? "该筛选条件下暂无文章，换个条件试试"
              : "暂无文章"}
          </p>
        </div>
      )}
    </div>
  );
}
