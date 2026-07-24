"use client";

import { useRouter } from "next/navigation";
import type { ProjectFormValues } from "@/lib/types";
import { ProjectForm } from "./project-form";

/** 编辑页客户端包装：提交 PATCH /api/projects/[id]，成功跳详情 */
export function ProjectEdit({
  id,
  initialValues,
}: {
  id: string;
  initialValues: Partial<ProjectFormValues>;
}) {
  const router = useRouter();

  async function onSubmit(values: ProjectFormValues) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "保存失败，请重试");
    }
    router.push(`/projects/${id}`);
    router.refresh();
  }

  return (
    <ProjectForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      submitLabel="保存修改"
    />
  );
}
