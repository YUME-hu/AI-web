import { notFound, redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { Project, ProjectFormValues } from "@/lib/types";
import { ProjectEdit } from "@/components/projects/project-edit";

export const metadata = { title: "编辑项目" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const project = data as Project;
  // date 列 YYYY-MM-DD → 表单 month 输入 YYYY-MM
  const initialValues: Partial<ProjectFormValues> = {
    title: project.title,
    description: project.description ?? "",
    tech_stack: project.tech_stack ?? [],
    tags: project.tags ?? [],
    features: project.features ?? [],
    highlights: project.highlights ?? [],
    role: project.role ?? "",
    repo_url: project.repo_url ?? "",
    demo_url: project.demo_url ?? "",
    status: project.status,
    start_date: project.start_date?.slice(0, 7) ?? "",
    end_date: project.end_date?.slice(0, 7) ?? "",
    readme_content: project.readme_content ?? "",
    cover_image: project.cover_image ?? "",
    is_published: project.is_published,
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-foreground">
          {"// EDIT PROJECT"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          编辑：{project.title}
        </h1>
        <div className="divider-tactical mt-6" />
      </section>

      <ProjectEdit id={id} initialValues={initialValues} />
    </div>
  );
}
