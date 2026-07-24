/**
 * Phase 5 RAG 共享逻辑（服务端）
 * 分块 / 可检索文本构建 / 向量索引同步 / 相似度检索
 * 读写均使用 service client（chat 是公开接口，无用户会话）
 */
import { embedText, embedTexts } from "./embedding";
import { createServiceClient } from "./supabase/service";
import { markdownToPlainText } from "./blog";
import type { BlogPost, Project } from "./types";

/**
 * 文本分块：\n\n 段落优先，超长段落按句读硬切，过短段落合并，目标每块 ≤ maxLen 字
 */
export function chunkText(text: string, maxLen = 500): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // 第一步：把超长段落切成 ≤maxLen 的片段
  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLen) {
      pieces.push(paragraph);
      continue;
    }
    // 按句号/问号/叹号/换行切句（保留标点），再贪心合并
    const sentences = paragraph.match(/[^。！？!?\n]+[。！？!?\n]?/g) ?? [paragraph];
    let buf = "";
    for (const sentence of sentences) {
      if (buf && (buf + sentence).length > maxLen) {
        pieces.push(buf);
        buf = sentence;
      } else {
        buf += sentence;
      }
      // 单句仍超长 → 按字符硬切
      while (buf.length > maxLen) {
        pieces.push(buf.slice(0, maxLen));
        buf = buf.slice(maxLen);
      }
    }
    if (buf) pieces.push(buf);
  }

  // 第二步：合并过短片段（不超限前提下）
  const chunks: string[] = [];
  let buf = "";
  for (const piece of pieces) {
    if (buf && (buf + "\n\n" + piece).length > maxLen) {
      chunks.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf}\n\n${piece}` : piece;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/** 项目 → 可检索文本 */
export function buildProjectText(project: Project): string {
  return [
    project.title,
    project.description ?? "",
    project.tech_stack.length > 0 ? `技术栈：${project.tech_stack.join("、")}` : "",
    project.features.length > 0 ? `核心功能：\n${project.features.join("\n")}` : "",
    project.highlights.length > 0 ? `技术亮点：\n${project.highlights.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const MAX_BLOG_TEXT_LENGTH = 8000;

/** 博客 → 可检索文本（Markdown 转纯文本，截断 8000 字） */
export function buildBlogText(post: BlogPost): string {
  const plain = markdownToPlainText(post.content).slice(0, MAX_BLOG_TEXT_LENGTH);
  return `${post.title}\n\n${plain}`;
}

/** 删除某来源的全部向量 */
export async function deleteSourceEmbeddings(
  sourceType: "project" | "blog",
  sourceId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw new Error(`向量删除失败：${error.message}`);
}

/**
 * 同步某来源的向量索引：先删旧向量 → 分块 → embedTexts → 批量 insert
 * 文本为空则只删除；返回写入的块数（reindex 统计用）
 */
export async function syncSourceEmbeddings(
  sourceType: "project" | "blog",
  sourceId: string,
  text: string,
): Promise<number> {
  const supabase = createServiceClient();
  const { error: deleteError } = await supabase
    .from("embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (deleteError) throw new Error(`向量删除失败：${deleteError.message}`);

  const trimmed = text.trim();
  if (!trimmed) return 0;

  const chunks = chunkText(trimmed);
  // 博客截断 8000 字 → 最多约 16 块，单次 embedTexts 调用足够（建议 ≤32 条）
  const vectors = await embedTexts(chunks);

  const rows = chunks.map((chunk_text, i) => ({
    source_type: sourceType,
    source_id: sourceId,
    chunk_index: i,
    chunk_text,
    // pgvector 接受 JSON 数组字符串
    embedding: JSON.stringify(vectors[i]),
  }));
  const { error: insertError } = await supabase.from("embeddings").insert(rows);
  if (insertError) throw new Error(`向量写入失败：${insertError.message}`);
  return chunks.length;
}

export interface RetrievedChunk {
  source_type: "project" | "blog";
  source_id: string;
  chunk_text: string;
  similarity: number;
}

/** 语义检索：embedText(query) → RPC match_embeddings */
export async function retrieve(
  query: string,
  matchCount = 5,
  threshold = 0.4,
): Promise<RetrievedChunk[]> {
  const vec = await embedText(query);
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: JSON.stringify(vec),
    match_count: matchCount,
    match_threshold: threshold,
  });
  if (error) throw new Error(`向量检索失败：${error.message}`);
  return (data ?? []) as RetrievedChunk[];
}
