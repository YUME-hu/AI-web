import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

/**
 * Markdown 渲染（服务端组件可用）：react-markdown + GFM + 代码高亮
 * components 映射贴合站内暗色主题；hljs 高亮样式在根布局全局引入
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-3 text-2xl font-bold tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-l-[3px] border-primary pl-3 text-xl font-bold">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-lg font-bold">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-relaxed text-foreground/90">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-4 transition-colors hover:text-glow-primary"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-6 text-foreground/90">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-6 text-foreground/90">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-primary bg-muted px-4 py-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    // 带语言类名的是代码块（由 pre 包裹渲染），否则是行内代码
    if (className) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-sm">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-3 py-1.5 text-left font-bold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-1.5">{children}</td>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <article>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
