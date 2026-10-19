"use client";

import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Save,
  SquareCode,
  Undo2,
} from "lucide-react";
import { slugifyTitle } from "@/lib/blog";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  type BlogPostFormValues,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";

const DEFAULT_VALUES: BlogPostFormValues = {
  title: "",
  slug: "",
  content: "",
  category: "tech_notes",
  tags: [],
  linked_project_id: "",
  is_published: false,
};

const FIELD_LABEL_CLASS = "font-mono text-xs text-muted-foreground";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "rounded-sm p-1.5 transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  // 监听事务让高亮状态（isActive）及时刷新
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    editor.on("transaction", forceRender);
    return () => {
      editor.off("transaction", forceRender);
    };
  }, [editor]);

  function setLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("链接地址：", "https://");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  const iconClass = "size-4";
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="粗体"
      >
        <Bold className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="斜体"
      >
        <Italic className={iconClass} />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="标题 2"
      >
        <Heading2 className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="标题 3"
      >
        <Heading3 className={iconClass} />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="无序列表"
      >
        <List className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="有序列表"
      >
        <ListOrdered className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        label="代码块"
      >
        <SquareCode className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="引用"
      >
        <Quote className={iconClass} />
      </ToolbarButton>
      <ToolbarButton onClick={setLink} active={editor.isActive("link")} label="链接">
        {editor.isActive("link") ? (
          <Link2Off className={iconClass} />
        ) : (
          <Link2 className={iconClass} />
        )}
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="撤销"
      >
        <Undo2 className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="重做"
      >
        <Redo2 className={iconClass} />
      </ToolbarButton>
    </div>
  );
}

/** 从编辑器取出 Markdown 原文 */
function getEditorMarkdown(editor: Editor | null): string {
  if (!editor) return "";
  const storage = editor.storage as { markdown?: MarkdownStorage };
  return storage.markdown?.getMarkdown() ?? "";
}

export function PostEditor({
  postId,
  initialValues,
  projects,
}: {
  postId?: string;
  initialValues?: Partial<BlogPostFormValues>;
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<BlogPostFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  // slug 被手动改过后不再跟随标题自动生成
  const [slugTouched, setSlugTouched] = useState(!!initialValues?.slug);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialValues?.content ?? "",
    // SSR 兼容：客户端挂载时再创建编辑器
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "blog-prose min-h-[360px] px-4 py-3 outline-none",
      },
    },
  });

  function set<K extends keyof BlogPostFormValues>(
    key: K,
    value: BlogPostFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(title: string) {
    setValues((prev) => ({
      ...prev,
      title,
      ...(slugTouched ? {} : { slug: title.trim() ? slugifyTitle(title) : "" }),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    set("slug", slug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = getEditorMarkdown(editor);
    if (!values.title.trim() || !values.slug.trim() || !content.trim()) {
      setError("标题、slug 与正文均不能为空");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...values,
        title: values.title.trim(),
        slug: values.slug.trim(),
        content,
      };
      const res = await fetch(postId ? `/api/blog/${postId}` : "/api/blog", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "保存失败，请重试");
      }
      if (!postId) {
        // 新建成功后切到编辑页，后续保存走 PATCH
        router.replace(`/blog/edit/${data.post.id}`);
      } else {
        setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 标题 / slug */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pe-title" className={FIELD_LABEL_CLASS}>
            标题 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pe-title"
            value={values.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="文章标题"
            className="rounded-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-slug" className={FIELD_LABEL_CLASS}>
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pe-slug"
            value={values.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="url-friendly-slug"
            className="rounded-sm font-mono"
          />
        </div>
      </div>

      {/* 分类 / 关联项目 / 发布 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pe-category" className={FIELD_LABEL_CLASS}>
            分类
          </Label>
          <select
            id="pe-category"
            value={values.category}
            onChange={(e) =>
              set("category", e.target.value as BlogPostFormValues["category"])
            }
            className="h-8 w-full rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
          >
            {BLOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {BLOG_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-project" className={FIELD_LABEL_CLASS}>
            关联项目
          </Label>
          <select
            id="pe-project"
            value={values.linked_project_id}
            onChange={(e) => set("linked_project_id", e.target.value)}
            className="h-8 w-full rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
          >
            <option value="">无关联</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>可见性</Label>
          <label className="flex h-8 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
              className="size-4 accent-primary"
            />
            公开发布
          </label>
        </div>
      </div>

      {/* 标签 */}
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>标签</Label>
        <TagInput
          value={values.tags}
          onChange={(v) => set("tags", v)}
          placeholder="回车添加标签"
        />
      </div>

      {/* 正文编辑器 */}
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>
          正文（Markdown） <span className="text-destructive">*</span>
        </Label>
        <div className="rounded-sm border border-input bg-secondary/40">
          {editor ? <EditorToolbar editor={editor} /> : null}
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={submitting} className="rounded-sm">
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {submitting
            ? "保存中…"
            : values.is_published
              ? "保存并发布"
              : "保存草稿"}
        </Button>
        {savedAt && (
          <span className="font-mono text-[10px] text-success">
            已保存 {savedAt}
          </span>
        )}
        {values.is_published && postId && (
          <a
            href={`/blog/${values.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-chart-blue"
          >
            查看公开页 →
          </a>
        )}
      </div>
    </form>
  );
}
