/**
 * Phase 3 博客辅助函数（纯函数，客户端/服务端均可用）
 */

/** Markdown → 纯文本（去除标记符号，用于 excerpt / 阅读时长计算） */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ") // 代码块
    .replace(/`([^`]*)`/g, "$1") // 行内代码保留文字
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^#{1,6}\s+/gm, "") // 标题
    .replace(/^>\s?/gm, "") // 引用
    .replace(/^[-*+]\s+/gm, "") // 无序列表
    .replace(/^\d+\.\s+/gm, "") // 有序列表
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, " ") // 分割线
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // 粗斜体/删除线
    .replace(/<[^>]+>/g, " ") // HTML 标签
    .replace(/\s+/g, " ")
    .trim();
}

/** 摘要：正文前 maxLength 字纯文本 */
export function computeExcerpt(content: string, maxLength = 160): string {
  const text = markdownToPlainText(content);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/** 阅读时长：按 400 字/分钟，中英混合按字符数计（不计空白），至少 1 分钟 */
export function computeReadingTime(content: string): number {
  const chars = markdownToPlainText(content).replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 400));
}

/** 标题 → slug：英文转 kebab-case；含中文等非 ASCII 字符时用 post-<时间戳> */
export function slugifyTitle(title: string): string {
  if (/[^\x00-\x7F]/.test(title)) {
    return `post-${Date.now()}`;
  }
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `post-${Date.now()}`;
}

/** 分类徽标配色：ideas=琥珀 life=青 tech_notes=绿 */
export const BLOG_CATEGORY_STYLES = {
  ideas: "border-accent/50 bg-accent/10 text-accent",
  life: "border-primary/50 bg-primary/10 text-primary",
  tech_notes: "border-success/50 bg-success/10 text-success",
} as const;
