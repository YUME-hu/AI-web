"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  EMPTY_RESUME_PROFILE,
  type Project,
  type ProjectMatch,
  type Resume,
  type ResumeEvaluation,
  type ResumeProfile,
} from "@/lib/types";
import { computeUserModifications } from "@/lib/resumes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StepJdAnalysis } from "./step-jd-analysis";
import { StepProjectMatch } from "./step-project-match";
import { StepEvaluate } from "./step-evaluate";
import { StepPreview } from "./step-preview";

const STEPS = [
  { key: 1, label: "JD 分析" },
  { key: 2, label: "项目匹配" },
  { key: 3, label: "AI 自评" },
  { key: 4, label: "预览导出" },
] as const;

interface WizardState {
  matches: ProjectMatch[];
  selectedIds: string[];
  finalDescriptions: Record<string, string>;
  projectOrder: string[];
  profile: ResumeProfile;
}

/** 已勾选项目按 projectOrder 排序（order 中缺失的追加在末尾） */
function orderedSelectedIds(
  projectOrder: string[],
  selectedIds: string[],
): string[] {
  const inOrder = projectOrder.filter((id) => selectedIds.includes(id));
  const missing = selectedIds.filter((id) => !projectOrder.includes(id));
  return [...inOrder, ...missing];
}

function formatDateRange(project: Project): string | null {
  const start = project.start_date?.slice(0, 7);
  const end = project.end_date?.slice(0, 7);
  if (!start && !end) return null;
  return `${start ?? "????-??"} — ${end ?? "至今"}`;
}

export function ResumeWizard({
  resume,
  projects,
}: {
  resume: Resume;
  projects: Project[];
}) {
  const gc = resume.generated_content;
  const [step, setStep] = useState(1);
  const [matches, setMatches] = useState<ProjectMatch[]>(gc?.matches ?? []);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    resume.selected_project_ids ?? [],
  );
  const [finalDescriptions, setFinalDescriptions] = useState<
    Record<string, string>
  >(gc?.finalDescriptions ?? {});
  const [projectOrder, setProjectOrder] = useState<string[]>(
    gc?.projectOrder ?? [],
  );
  const [profile, setProfile] = useState<ResumeProfile>({
    ...EMPTY_RESUME_PROFILE,
    ...gc?.profile,
  });
  const [evaluation, setEvaluation] = useState<ResumeEvaluation[] | null>(
    resume.ai_evaluation,
  );
  const [matching, setMatching] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  // ref 镜像最新状态，避免异步 persist 闭包读到旧值（在 effect 中同步，不在渲染期写 ref）
  const stateRef = useRef<WizardState>({
    matches,
    selectedIds,
    finalDescriptions,
    projectOrder,
    profile,
  });
  useEffect(() => {
    stateRef.current = {
      matches,
      selectedIds,
      finalDescriptions,
      projectOrder,
      profile,
    };
  });

  /** PATCH 持久化全部可编辑状态（含 AI 原文 vs 用户修改的差异摘要） */
  async function persist(patch?: Partial<WizardState>): Promise<void> {
    const s = { ...stateRef.current, ...patch };
    setSaving(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedProjectIds: s.selectedIds,
          generatedContent: {
            profile: s.profile,
            matches: s.matches,
            finalDescriptions: s.finalDescriptions,
            projectOrder: s.projectOrder,
          },
          userModifications: computeUserModifications(s.matches, s.finalDescriptions),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "保存失败，请重试");
      }
      setSavedAt(
        new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  /** 步骤 2：AI 匹配项目，默认勾选 score 前 5 */
  async function runMatch() {
    setMatching(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resume.id}/match`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "匹配失败，请重试");
      }
      const m = data.matches as ProjectMatch[];
      const sel = m.slice(0, 5).map((x) => x.projectId);
      const fd = { ...stateRef.current.finalDescriptions };
      for (const x of m) {
        if (!fd[x.projectId]) fd[x.projectId] = x.suggestedDescription;
      }
      // 保留既有排序中仍被选中的项目，新选中的按分数顺序追加
      const order = [
        ...stateRef.current.projectOrder.filter((id) => sel.includes(id)),
        ...sel.filter((id) => !stateRef.current.projectOrder.includes(id)),
      ];
      setMatches(m);
      setSelectedIds(sel);
      setFinalDescriptions(fd);
      setProjectOrder(order);
      await persist({ matches: m, selectedIds: sel, finalDescriptions: fd, projectOrder: order });
    } catch (err) {
      setError(err instanceof Error ? err.message : "匹配失败，请重试");
    } finally {
      setMatching(false);
    }
  }

  /** 步骤 2：勾选变化即时持久化 */
  function toggleProject(projectId: string, checked: boolean) {
    const s = stateRef.current;
    const sel = checked
      ? [...s.selectedIds, projectId]
      : s.selectedIds.filter((id) => id !== projectId);
    const order = checked
      ? [...s.projectOrder.filter((id) => id !== projectId), projectId]
      : s.projectOrder.filter((id) => id !== projectId);
    setSelectedIds(sel);
    setProjectOrder(order);
    void persist({ selectedIds: sel, projectOrder: order });
  }

  function changeDescription(projectId: string, text: string) {
    setFinalDescriptions({ ...stateRef.current.finalDescriptions, [projectId]: text });
  }

  /** 步骤 3：对当前勾选项目的最终描述进行 AI 自评 */
  async function runEvaluate() {
    const s = stateRef.current;
    const ordered = orderedSelectedIds(s.projectOrder, s.selectedIds);
    if (ordered.length === 0) {
      setError("请先在「项目匹配」中勾选至少一个项目");
      return;
    }
    setEvaluating(true);
    setError(null);
    try {
      const items = ordered.map((id) => ({
        projectId: id,
        title: projectById.get(id)?.title ?? "",
        description: s.finalDescriptions[id] ?? "",
      }));
      const res = await fetch(`/api/resumes/${resume.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "评估失败，请重试");
      }
      setEvaluation(data.evaluation as ResumeEvaluation[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "评估失败，请重试");
    } finally {
      setEvaluating(false);
    }
  }

  /** 步骤 4：调整项目展示顺序 */
  function moveProject(projectId: string, dir: -1 | 1) {
    const s = stateRef.current;
    const order = orderedSelectedIds(s.projectOrder, s.selectedIds);
    const i = order.indexOf(projectId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setProjectOrder(order);
    void persist({ projectOrder: order });
  }

  function changeProfile(key: keyof ResumeProfile, value: string) {
    setProfile({ ...stateRef.current.profile, [key]: value });
  }

  // 预览 / PDF 数据：按顺序的已勾选项目 + 聚合技能
  const orderedIds = orderedSelectedIds(projectOrder, selectedIds);
  const previewItems = orderedIds
    .map((id) => {
      const project = projectById.get(id);
      if (!project) return null;
      return {
        project,
        description: finalDescriptions[id] ?? "",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const skills = [
    ...new Set(previewItems.flatMap((x) => x.project.tech_stack)),
  ];
  const pdfData = {
    profile,
    targetRole: resume.target_role ?? "",
    projects: previewItems.map((x) => ({
      title: x.project.title,
      dateRange: formatDateRange(x.project),
      techStack: x.project.tech_stack,
      description: x.description,
    })),
    skills,
  };
  const roleSlug = (resume.target_role ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w一-龥-]/g, "");
  const fileName = `resume-${roleSlug || "resume"}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <div className="space-y-6">
      {/* 步骤指示器 */}
      <nav className="flex border-b border-border">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs transition-colors",
              step === s.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>0{s.key}</span>
            {s.label}
          </button>
        ))}
        <span className="ml-auto hidden items-center font-mono text-[10px] text-muted-foreground sm:flex">
          {saving ? "保存中…" : savedAt ? `已保存 ${savedAt}` : ""}
        </span>
      </nav>

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 分步内容 */}
      {step === 1 && <StepJdAnalysis resume={resume} />}
      {step === 2 && (
        <StepProjectMatch
          projects={projects}
          matches={matches}
          selectedIds={selectedIds}
          finalDescriptions={finalDescriptions}
          matching={matching}
          onMatch={runMatch}
          onToggle={toggleProject}
          onDescriptionChange={changeDescription}
          onDescriptionCommit={() => void persist()}
        />
      )}
      {step === 3 && (
        <StepEvaluate
          evaluation={evaluation}
          evaluating={evaluating}
          selectedCount={selectedIds.length}
          onEvaluate={runEvaluate}
          projectById={projectById}
        />
      )}
      {step === 4 && (
        <StepPreview
          profile={profile}
          onProfileChange={changeProfile}
          onProfileCommit={() => void persist()}
          items={previewItems}
          skills={skills}
          onMove={moveProject}
          onSave={() => void persist()}
          saving={saving}
          savedAt={savedAt}
          pdfData={pdfData}
          fileName={fileName}
        />
      )}

      {/* 底部步进 */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ChevronLeft className="size-4" />
          上一步
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          STEP 0{step} / 04
        </span>
        <Button
          size="sm"
          className="rounded-sm"
          disabled={step === 4}
          onClick={() => setStep((s) => Math.min(4, s + 1))}
        >
          下一步
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
