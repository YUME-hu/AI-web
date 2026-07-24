import { createServiceClient } from "@/lib/supabase/service";
import type { BlogPost } from "@/lib/types";

// RSS 同样走 ISR 缓存
export const revalidate = 3600;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CDATA 内容中不能出现 ]]>，拆段处理 */
function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** GET /feed.xml — RSS 2.0，最近 20 篇已发布文章 */
export async function GET() {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  let posts: Pick<
    BlogPost,
    "title" | "slug" | "excerpt" | "category" | "published_at"
  >[] = [];
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("title, slug, excerpt, category, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(20);
    posts = data ?? [];
  } catch {
    // Supabase 未配置时输出空 feed，不阻塞构建
  }

  const items = posts
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.published_at ?? Date.now()).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <description>${cdata(post.excerpt ?? "")}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>个人开发者平台</title>
    <link>${siteUrl}</link>
    <description>AI 驱动的求职闭环平台：项目库、技术博客、开发记录</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
