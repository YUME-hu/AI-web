"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import type { ProjectFormValues, ProjectParseResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProjectForm } from "./project-form";

/**
 * README → AI 解析 → 表单确认 → 入库
 * 解析不落库，用户在表单中修改确认后才 POST /api/projects
 */
export function ProjectImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [readme, setReadme] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedValues, setParsedValues] =
    useState<Partial<ProjectFormValues> | null>(null);
  // 每次解析递增，作为表单 key 强制用新结果重新初始化
  const [formKey, setFormKey] = useState(0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReadme(String(reader.result ?? ""));
    reader.readAsText(file);
    // 允许重复选择同一文件
    e.target.value = "";
  }

  async function parse() {
    if (!readme.trim()) {
      setError("请先粘贴 README 内容或选择 .md 文件");
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readme }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "解析失败，请重试");
      }
      const p = data.parsed as ProjectParseResult;
      setParsedValues({
        title: p.name ?? "",
        description: p.description ?? "",
        tech_stack: p.techStack ?? [],
        features: p.features ?? [],
        highlights: p.highlights ?? [],
        role: p.role ?? "",
        repo_url: p.repoUrl ?? "",
        demo_url: p.demoUrl ?? "",
        status: "completed",
        start_date: p.startDate ?? "",
        end_date: p.endDate ?? "",
        // README 原文随表单隐藏保留，一并入库
        readme_content: readme,
        is_published: true,
      });
      setFormKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败，请重试");
    } finally {
      setParsing(false);
    }
  }

  async function submit(values: ProjectFormValues) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error ?? "入库失败，请重试");
    }
    router.push(`/projects/${data.project.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* 第一步：README 输入 */}
      <section className="clip-corner border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            01 // README 内容
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-3.5" />
            选择 .md 文件
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={handleFile}
            className="hidden"
          />
        </div>
        <Textarea
          value={readme}
          onChange={(e) => setReadme(e.target.value)}
          placeholder="# 粘贴项目的 README 内容…"
          rows={10}
          className="mt-3 rounded-sm font-mono text-xs"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            onClick={parse}
            disabled={parsing}
            className="rounded-sm"
          >
            {parsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {parsing ? "AI 解析中…" : "AI 解析"}
          </Button>
          <span className="font-mono text-[10px] text-muted-foreground">
            {readme.length > 0 ? `${readme.length} 字符` : "支持粘贴文本或上传 .md 文件"}
          </span>
        </div>
      </section>

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 第二步：解析结果确认 */}
      {parsedValues && (
        <section className="clip-corner border border-border bg-card p-5">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            02 // 确认项目信息
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 解析结果已预填，可直接修改，确认无误后入库。
          </p>
          <div className="mt-4">
            <ProjectForm
              key={formKey}
              initialValues={parsedValues}
              onSubmit={submit}
              submitLabel="确认入库"
            />
          </div>
        </section>
      )}
    </div>
  );
}
