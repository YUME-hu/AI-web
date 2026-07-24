import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  FolderGit2,
  Layers,
  Pencil,
  Sparkles,
  User,
} from "lucide-react";
import { createClient, isAdmin } from "@/lib/supabase/server";
import {
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type PageProps = { params: Promise<{ id: string }> };

const STATUS_STYLE: Record<ProjectStatus, string> = {
  in_progress: "border-accent/50 bg-accent/10 text-accent",
  completed: "border-success/50 bg-success/10 text-success",
  archived: "border-border bg-muted text-muted-foreground",
  planned: "border-primary/50 bg-primary/10 text-primary",
};

async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Project | null) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.title ?? "项目详情" };
}

function formatRange(project: Project): string | null {
  const start = project.start_date?.slice(0, 7);
  const end = project.end_date?.slice(0, 7);
  if (!start && !end) return null;
  return `${start ?? "????-??"} — ${end ?? "至今"}`;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const admin = await isAdmin();
  // 未发布项目仅管理员可见
  if (!project.is_published && !admin) notFound();

  const range = formatRange(project);

  return (
    <div className="space-y-8">
      {/* 头部：标题 / 状态 / 日期 / 角色 / 链接 */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary">
              {"// PROJECT DETAIL"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {project.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge
                variant="outline"
                className={cn("rounded-sm", STATUS_STYLE[project.status])}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              {!project.is_published && (
                <Badge
                  variant="outline"
                  className="rounded-sm border-destructive/50 bg-destructive/10 text-destructive"
                >
                  未发布 · 仅管理员可见
                </Badge>
              )}
              {range && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {range}
                </span>
              )}
              {project.role && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <User className="size-3.5" />
                  {project.role}
                </span>
              )}
            </div>
          </div>

          {admin && (
            <Link
              href={`/projects/${project.id}/edit`}
              className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Pencil className="size-3.5" />
              编辑
            </Link>
          )}
        </div>

        {(project.repo_url || project.demo_url) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                <FolderGit2 className="size-3.5" />
                源代码
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
              >
                <ExternalLink className="size-3.5" />
                在线预览
              </a>
            )}
          </div>
        )}

        <div className="divider-tactical mt-6" />
      </section>

      {/* 简介 */}
      {project.description && (
        <section>
          <p className="text-base leading-relaxed text-foreground/90">
            {project.description}
          </p>
        </section>
      )}

      {/* 核心功能 / 技术亮点 */}
      <div className="grid gap-4 md:grid-cols-2">
        {project.features.length > 0 && (
          <section className="clip-corner border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-primary uppercase">
              <Layers className="size-4" />
              核心功能
            </h2>
            <ul className="mt-3 space-y-2">
              {project.features.map((feature, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="font-mono text-primary">▸</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        )}
        {project.highlights.length > 0 && (
          <section className="clip-corner border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-accent uppercase">
              <Sparkles className="size-4" />
              技术亮点
            </h2>
            <ul className="mt-3 space-y-2">
              {project.highlights.map((highlight, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="font-mono text-accent">▸</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* 技术栈 / 标签 */}
      {(project.tech_stack.length > 0 || project.tags.length > 0) && (
        <section className="space-y-3">
          {project.tech_stack.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                技术栈
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tech_stack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="outline"
                    className="rounded-sm font-mono text-xs"
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {project.tags.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                标签
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="rounded-sm font-mono text-xs"
                  >
                    # {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 关联内容占位：Phase 3/4 接入 */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-dashed border-border p-5">
          <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <FileText className="size-4" />
            关联文章
          </h2>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            {"// Phase 3 接入"}
          </p>
        </div>
        <div className="border border-dashed border-border p-5">
          <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <CalendarClock className="size-4" />
            日历事件
          </h2>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            {"// Phase 4 接入"}
          </p>
        </div>
      </section>
    </div>
  );
}
