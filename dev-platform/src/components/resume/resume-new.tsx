"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** 新建简历：粘贴 JD + 目标岗位 → POST /api/resumes → 跳转向导页 */
export function ResumeNew() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [jdContent, setJdContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!targetRole.trim() || !jdContent.trim()) {
      setError("请填写目标岗位并粘贴岗位描述（JD）");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdContent, targetRole: targetRole.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "分析失败，请重试");
      }
      router.push(`/resume/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <section className="clip-corner border border-border bg-card p-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rn-role" className="font-mono text-xs text-muted-foreground">
            目标岗位 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rn-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="例如：前端开发工程师"
            className="rounded-sm sm:max-w-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rn-jd" className="font-mono text-xs text-muted-foreground">
            岗位描述（JD） <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rn-jd"
            value={jdContent}
            onChange={(e) => setJdContent(e.target.value)}
            placeholder="粘贴招聘启事全文：岗位职责、任职要求、技能栈…"
            rows={12}
            className="rounded-sm font-mono text-xs"
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {jdContent.length > 0 ? `${jdContent.length} 字符` : "支持纯文本，AI 将提取技能要求与关键词"}
          </p>
        </div>

        {error && (
          <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button onClick={analyze} disabled={submitting} className="rounded-sm">
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanSearch className="size-4" />
          )}
          {submitting ? "AI 分析中…" : "开始分析"}
        </Button>
      </div>
    </section>
  );
}
