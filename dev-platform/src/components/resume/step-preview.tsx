"use client";

import { ArrowDown, ArrowUp, Save } from "lucide-react";
import type { Project, ResumeProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PdfExportButton } from "./pdf-export-button";
import type { ResumePdfData } from "./resume-pdf";

interface PreviewItem {
  project: Project;
  description: string;
}

const PROFILE_FIELDS: { key: keyof ResumeProfile; label: string; placeholder: string }[] = [
  { key: "name", label: "姓名", placeholder: "张三" },
  { key: "title", label: "职位", placeholder: "前端开发工程师" },
  { key: "email", label: "邮箱", placeholder: "you@example.com" },
  { key: "github", label: "GitHub", placeholder: "github.com/username" },
  { key: "website", label: "个人网站", placeholder: "yoursite.dev" },
];

function formatRange(project: Project): string | null {
  const start = project.start_date?.slice(0, 7);
  const end = project.end_date?.slice(0, 7);
  if (!start && !end) return null;
  return `${start ?? "????-??"} — ${end ?? "至今"}`;
}

interface StepPreviewProps {
  profile: ResumeProfile;
  onProfileChange: (key: keyof ResumeProfile, value: string) => void;
  onProfileCommit: () => void;
  items: PreviewItem[];
  skills: string[];
  onMove: (projectId: string, dir: -1 | 1) => void;
  onSave: () => void;
  saving: boolean;
  savedAt: string | null;
  pdfData: ResumePdfData;
  fileName: string;
}

/** 步骤 4：简历预览（个人信息行内编辑 + 项目排序）+ 保存 / 导出 PDF */
export function StepPreview({
  profile,
  onProfileChange,
  onProfileCommit,
  items,
  skills,
  onMove,
  onSave,
  saving,
  savedAt,
  pdfData,
  fileName,
}: StepPreviewProps) {
  return (
    <div className="space-y-4">
      {/* 个人信息编辑 */}
      <section className="card-hazard rivet border border-foreground bg-card p-5">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          个人信息（失焦自动保存）
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROFILE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label
                htmlFor={`sp-${field.key}`}
                className="font-mono text-[10px] text-muted-foreground"
              >
                {field.label}
              </Label>
              <Input
                id={`sp-${field.key}`}
                value={profile[field.key]}
                onChange={(e) => onProfileChange(field.key, e.target.value)}
                onBlur={onProfileCommit}
                placeholder={field.placeholder}
                className="rounded-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 简历文档预览 */}
      <section className="card-hazard rivet border border-foreground bg-card p-6 md:p-8">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              尚未勾选任何项目，请返回「项目匹配」选择
            </p>
          </div>
        ) : (
          <>
            {/* 文档头部 */}
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {profile.name || "（姓名）"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {[profile.title, profile.email, profile.github, profile.website]
                  .filter(Boolean)
                  .join("  |  ") || "（职位 / 联系方式）"}
              </p>
            </div>
            <div className="divider-tactical mt-4" />

            {/* 项目经历 */}
            <h4 className="mt-5 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              项目经历
            </h4>
            <div className="mt-3 space-y-5">
              {items.map(({ project, description }, index) => (
                <div key={project.id} className="group flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-bold">{project.title}</p>
                      {formatRange(project) && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatRange(project)}
                        </span>
                      )}
                    </div>
                    {project.tech_stack.length > 0 && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {project.tech_stack.join(" / ")}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                      {description || "（暂无描述，请在「项目匹配」中填写）"}
                    </p>
                  </div>
                  {/* 排序按钮 */}
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => onMove(project.id, -1)}
                      disabled={index === 0}
                      aria-label="上移"
                      className="text-muted-foreground transition-colors hover:text-chart-blue disabled:opacity-30"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => onMove(project.id, 1)}
                      disabled={index === items.length - 1}
                      aria-label="下移"
                      className="text-muted-foreground transition-colors hover:text-chart-blue disabled:opacity-30"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 技能 */}
            {skills.length > 0 && (
              <>
                <h4 className="mt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  技能
                </h4>
                <p className="mt-2 font-mono text-xs leading-relaxed text-foreground/90">
                  {skills.join("  ·  ")}
                </p>
              </>
            )}
          </>
        )}
      </section>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onSave} disabled={saving} className="rounded-sm">
          <Save className="size-4" />
          {saving ? "保存中…" : "保存"}
        </Button>
        <PdfExportButton data={pdfData} fileName={fileName} />
        {savedAt && (
          <span className="font-mono text-[10px] text-success">
            已保存 {savedAt}
          </span>
        )}
      </div>
    </div>
  );
}
