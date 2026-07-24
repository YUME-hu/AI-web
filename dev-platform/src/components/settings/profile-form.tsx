"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { Profile, ProfileFormValues } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";

const FIELD_LABEL_CLASS = "font-mono text-xs text-muted-foreground";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [values, setValues] = useState<ProfileFormValues>({
    name: profile?.name ?? "",
    title: profile?.title ?? "",
    bio: profile?.bio ?? "",
    email: profile?.email ?? "",
    github: profile?.github ?? "",
    website: profile?.website ?? "",
    skills: profile?.skills ?? [],
    avatar_url: profile?.avatar_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "保存失败，请重试");
      }
      setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name" className={FIELD_LABEL_CLASS}>
            姓名
          </Label>
          <Input
            id="pf-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="张三"
            maxLength={50}
            className="rounded-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-title" className={FIELD_LABEL_CLASS}>
            职位
          </Label>
          <Input
            id="pf-title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="前端开发工程师"
            className="rounded-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-bio" className={FIELD_LABEL_CLASS}>
          个人简介（500 字内）
        </Label>
        <Textarea
          id="pf-bio"
          value={values.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="一句话介绍你自己，会显示在首页 Hero 区"
          className="rounded-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-email" className={FIELD_LABEL_CLASS}>
            邮箱
          </Label>
          <Input
            id="pf-email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="rounded-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-github" className={FIELD_LABEL_CLASS}>
            GitHub
          </Label>
          <Input
            id="pf-github"
            value={values.github}
            onChange={(e) => set("github", e.target.value)}
            placeholder="https://github.com/username"
            className="rounded-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-website" className={FIELD_LABEL_CLASS}>
            个人网站
          </Label>
          <Input
            id="pf-website"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://yoursite.dev"
            className="rounded-sm font-mono"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-avatar" className={FIELD_LABEL_CLASS}>
            头像 URL
          </Label>
          <Input
            id="pf-avatar"
            value={values.avatar_url}
            onChange={(e) => set("avatar_url", e.target.value)}
            placeholder="https://…/avatar.png"
            className="rounded-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>技能标签</Label>
          <TagInput
            value={values.skills}
            onChange={(v) => set("skills", v)}
            placeholder="回车添加，如 TypeScript"
          />
        </div>
      </div>

      {error && (
        <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="rounded-sm">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "保存中…" : "保存"}
        </Button>
        {savedAt && (
          <span className="font-mono text-[10px] text-success">
            已保存 {savedAt}
          </span>
        )}
      </div>
    </form>
  );
}
