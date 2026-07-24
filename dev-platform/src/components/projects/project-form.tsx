"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectFormValues,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const DEFAULT_VALUES: ProjectFormValues = {
  title: "",
  description: "",
  tech_stack: [],
  tags: [],
  features: [],
  highlights: [],
  role: "",
  repo_url: "",
  demo_url: "",
  status: "completed",
  start_date: "",
  end_date: "",
  readme_content: "",
  cover_image: "",
  is_published: true,
};

const FIELD_LABEL_CLASS = "font-mono text-xs text-muted-foreground";

/** 标签输入：回车添加 chip，chip 带 x 删除 */
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const item = draft.trim();
    if (item && !value.includes(item)) {
      onChange([...value, item]);
    }
    setDraft("");
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-sm border border-input bg-input/30 px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {value.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground"
        >
          {item}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== item))}
            aria-label={`删除 ${item}`}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        // 失焦时把草稿收进列表，避免遗漏
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function ProjectForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ProjectFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("项目标题为必填项");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...values, title: values.title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请重试");
      setSubmitting(false);
    }
    // 成功时由 onSubmit 负责跳转，无需重置 submitting
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 标题 */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-title" className={FIELD_LABEL_CLASS}>
          项目标题 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="pf-title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="例如：个人开发者平台"
          className="rounded-sm"
        />
      </div>

      {/* 简介 */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-description" className={FIELD_LABEL_CLASS}>
          一句话简介
        </Label>
        <Textarea
          id="pf-description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="50 字以内，说明这个项目做什么"
          rows={2}
          className="rounded-sm"
        />
      </div>

      {/* 四个标签输入 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>技术栈</Label>
          <TagInput
            value={values.tech_stack}
            onChange={(v) => set("tech_stack", v)}
            placeholder="回车添加，如 React"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>标签</Label>
          <TagInput
            value={values.tags}
            onChange={(v) => set("tags", v)}
            placeholder="回车添加，如 全栈"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>核心功能</Label>
          <TagInput
            value={values.features}
            onChange={(v) => set("features", v)}
            placeholder="回车添加一条功能"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>技术亮点</Label>
          <TagInput
            value={values.highlights}
            onChange={(v) => set("highlights", v)}
            placeholder="回车添加一条亮点"
          />
        </div>
      </div>

      {/* 角色 / 链接 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-role" className={FIELD_LABEL_CLASS}>
            角色 / 职责
          </Label>
          <Input
            id="pf-role"
            value={values.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="例如：独立开发"
            className="rounded-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-repo" className={FIELD_LABEL_CLASS}>
            仓库地址
          </Label>
          <Input
            id="pf-repo"
            value={values.repo_url}
            onChange={(e) => set("repo_url", e.target.value)}
            placeholder="https://github.com/…"
            className="rounded-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-demo" className={FIELD_LABEL_CLASS}>
            预览地址
          </Label>
          <Input
            id="pf-demo"
            value={values.demo_url}
            onChange={(e) => set("demo_url", e.target.value)}
            placeholder="https://…"
            className="rounded-sm font-mono"
          />
        </div>
      </div>

      {/* 状态 / 日期 / 发布 */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="pf-status" className={FIELD_LABEL_CLASS}>
            状态
          </Label>
          <select
            id="pf-status"
            value={values.status}
            onChange={(e) =>
              set("status", e.target.value as ProjectFormValues["status"])
            }
            className="h-8 w-full rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-start" className={FIELD_LABEL_CLASS}>
            开始时间
          </Label>
          <Input
            id="pf-start"
            type="month"
            value={values.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="rounded-sm font-mono [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-end" className={FIELD_LABEL_CLASS}>
            结束时间
          </Label>
          <Input
            id="pf-end"
            type="month"
            value={values.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className="rounded-sm font-mono [color-scheme:dark]"
          />
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

      {/* readme_content / cover_image 在 values 中隐藏保留，不渲染输入项 */}

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={submitting} className="rounded-sm">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "提交中…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
