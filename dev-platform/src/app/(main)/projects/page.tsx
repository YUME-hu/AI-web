import Link from "next/link";
import { FileUp } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { queryProjects } from "@/lib/projects";
import {
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProjectFilters } from "@/components/projects/project-filters";

export const metadata = { title: "项目库" };

/** 状态徽标配色：进行中=琥珀、已完成=绿、已归档=muted、计划中=青 */
const STATUS_STYLE: Record<ProjectStatus, string> = {
  in_progress: "border-accent/50 bg-accent/10 text-accent",
  completed: "border-success/50 bg-success/10 text-success",
  archived: "border-border bg-muted text-muted-foreground",
  planned: "border-primary/50 bg-primary/10 text-primary",
};

function formatRange(project: Project): string | null {
  const start = project.start_date?.slice(0, 7);
  const end = project.end_date?.slice(0, 7);
  if (!start && !end) return null;
  return `${start ?? "????-??"} — ${end ?? "至今"}`;
}

function firstString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = {
    q: firstString(sp.q),
    tech: firstString(sp.tech),
    status: firstString(sp.status),
  };

  const supabase = await createClient();
  const user = await getUser();
  const { projects } = await queryProjects(
    supabase,
    {
      q: filters.q || undefined,
      tech: filters.tech || undefined,
      tag: firstString(sp.tag) || undefined,
      status: filters.status || undefined,
      from: firstString(sp.from) || undefined,
      to: firstString(sp.to) || undefined,
    },
    !user,
  );

  const hasFilter = !!(filters.q || filters.tech || filters.status);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-primary">
            {"// PROJECT ARCHIVE"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">项目库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {projects.length} 个项目
          </p>
        </div>
        {user && (
          <Link
            href="/projects/import"
            className="flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
          >
            <FileUp className="size-3.5" />
            导入项目
          </Link>
        )}
      </section>

      <div className="divider-tactical" />

      {/* 筛选 */}
      <ProjectFilters initial={filters} />

      {/* 项目卡片网格 */}
      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const range = formatRange(project);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="clip-corner group flex flex-col border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold transition-colors group-hover:text-primary">
                    {project.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 rounded-sm", STATUS_STYLE[project.status])}
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {project.description ?? "暂无简介"}
                </p>

                {project.tech_stack.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.tech_stack.slice(0, 5).map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="rounded-sm font-mono text-[10px] text-muted-foreground"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}

                {range && (
                  <p className="mt-auto pt-3 font-mono text-[10px] text-muted-foreground">
                    {range}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO DATA"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilter
              ? "未检索到匹配的项目记录，请调整筛选条件"
              : "项目库暂无公开项目"}
          </p>
        </div>
      )}
    </div>
  );
}
