"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ProjectFilterValues {
  q: string;
  tech: string;
  status: string;
}

/**
 * 项目筛选条：修改 URL searchParams 触发服务端重新查询
 */
export function ProjectFilters({ initial }: { initial: ProjectFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initial.q);
  const [tech, setTech] = useState(initial.tech);
  const [status, setStatus] = useState(initial.status);

  function apply(nextStatus = status) {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (tech.trim()) sp.set("tech", tech.trim());
    if (nextStatus) sp.set("status", nextStatus);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索项目标题 / 简介…"
        className="rounded-sm sm:max-w-64"
      />
      <Input
        value={tech}
        onChange={(e) => setTech(e.target.value)}
        placeholder="技术栈，如 React"
        className="rounded-sm font-mono sm:max-w-40"
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          // 下拉变更立即生效
          apply(e.target.value);
        }}
        className="h-8 rounded-sm border border-input bg-input/30 px-2 text-sm outline-none [color-scheme:dark] focus-visible:border-ring"
      >
        <option value="">全部状态</option>
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PROJECT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" className="rounded-sm">
        <Search className="size-3.5" />
        筛选
      </Button>
    </form>
  );
}
