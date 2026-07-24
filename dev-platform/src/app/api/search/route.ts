import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmbeddingError } from "@/lib/embedding";
import { retrieve } from "@/lib/rag";
import type { SearchResult } from "@/lib/types";

/**
 * GET /api/search?q=xxx — 公开语义搜索
 * retrieve → 按来源去重（保留最高分块）→ join 标题/slug → 卡片数据
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "请输入搜索关键词" }, { status: 400 });
  }

  try {
    const chunks = await retrieve(q, 8, 0.35);

    // 按 source_id 去重，保留相似度最高的块
    const bestByKey = new Map<string, (typeof chunks)[number]>();
    for (const chunk of chunks) {
      const key = `${chunk.source_type}:${chunk.source_id}`;
      const prev = bestByKey.get(key);
      if (!prev || chunk.similarity > prev.similarity) {
        bestByKey.set(key, chunk);
      }
    }
    const deduped = [...bestByKey.values()].sort(
      (a, b) => b.similarity - a.similarity,
    );

    // join 来源标题/slug（博客仅已发布）
    const projectIds = deduped
      .filter((c) => c.source_type === "project")
      .map((c) => c.source_id);
    const blogIds = deduped
      .filter((c) => c.source_type === "blog")
      .map((c) => c.source_id);

    const supabase = createServiceClient();
    const [{ data: projects }, { data: posts }] = await Promise.all([
      projectIds.length
        ? supabase.from("projects").select("id, title").in("id", projectIds)
        : Promise.resolve({ data: [] }),
      blogIds.length
        ? supabase
            .from("blog_posts")
            .select("id, title, slug")
            .in("id", blogIds)
            .eq("is_published", true)
        : Promise.resolve({ data: [] }),
    ]);
    const projectTitle = new Map((projects ?? []).map((p) => [p.id, p.title]));
    const postById = new Map((posts ?? []).map((p) => [p.id, p]));

    const results: SearchResult[] = [];
    for (const chunk of deduped) {
      if (chunk.source_type === "project") {
        const title = projectTitle.get(chunk.source_id);
        if (!title) continue;
        results.push({
          sourceType: "project",
          sourceId: chunk.source_id,
          title,
          similarity: chunk.similarity,
          snippet: chunk.chunk_text.slice(0, 120),
          url: `/projects/${chunk.source_id}`,
        });
      } else {
        const post = postById.get(chunk.source_id);
        if (!post) continue;
        results.push({
          sourceType: "blog",
          sourceId: chunk.source_id,
          title: post.title,
          similarity: chunk.similarity,
          snippet: chunk.chunk_text.slice(0, 120),
          url: `/blog/${post.slug}`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof EmbeddingError) {
      return NextResponse.json(
        { error: `搜索服务异常：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "搜索失败，请稍后重试" }, { status: 500 });
  }
}
