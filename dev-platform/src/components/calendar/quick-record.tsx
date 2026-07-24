"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 快速记录：手动事件（date 默认今天）→ POST /api/calendar/events → 刷新 */
export function QuickRecord({
  projects,
}: {
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayString());
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          title: title.trim(),
          linked_project_id: projectId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "记录失败，请重试");
      }
      setTitle("");
      setProjectId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="clip-corner h-fit border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
        <CalendarPlus className="size-4" />
        快速记录
      </h3>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="qr-date" className="font-mono text-[10px] text-muted-foreground">
            日期
          </Label>
          <Input
            id="qr-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-sm font-mono [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-title" className="font-mono text-[10px] text-muted-foreground">
            标题 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="qr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：完成简历模块联调"
            className="rounded-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-project" className="font-mono text-[10px] text-muted-foreground">
            关联项目
          </Label>
          <select
            id="qr-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
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

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={submitting}
          size="sm"
          className="w-full rounded-sm"
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          {submitting ? "记录中…" : "记录"}
        </Button>
      </form>
    </section>
  );
}
