import { redirect } from "next/navigation";
import { Activity, FileText, Rocket } from "lucide-react";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { BlogPost, CalendarEvent } from "@/lib/types";
import { Heatmap } from "@/components/calendar/heatmap";
import {
  CalendarView,
  type CalendarViewEvent,
} from "@/components/calendar/calendar-view";
import { QuickRecord } from "@/components/calendar/quick-record";

export const metadata = { title: "开发日历" };

export default async function CalendarPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/calendar");
  }

  const supabase = await createClient();
  const [{ data: eventsData }, { data: projectsData }, { count: inProgressCount }] =
    await Promise.all([
      supabase.from("calendar_events").select("*").order("date", { ascending: true }),
      supabase
        .from("projects")
        .select("id, title")
        .order("updated_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
    ]);
  const events = (eventsData ?? []) as CalendarEvent[];
  const projects = projectsData ?? [];

  // 事件详情弹层需要关联文章 slug/标题：FK 名不确定，手动 join
  const blogIds = [
    ...new Set(
      events.map((e) => e.linked_blog_id).filter((id): id is string => !!id),
    ),
  ];
  const { data: linkedPosts } = blogIds.length
    ? await supabase
        .from("blog_posts")
        .select("id, title, slug")
        .in("id", blogIds)
    : { data: [] };
  const blogById = new Map(
    ((linkedPosts ?? []) as Pick<BlogPost, "id" | "title" | "slug">[]).map((p) => [
      p.id,
      p,
    ]),
  );
  const projectTitleById = new Map(projects.map((p) => [p.id, p.title]));

  const viewEvents: CalendarViewEvent[] = events.map((e) => ({
    ...e,
    projectTitle: e.linked_project_id
      ? (projectTitleById.get(e.linked_project_id) ?? null)
      : null,
    blogTitle: e.linked_blog_id ? (blogById.get(e.linked_blog_id)?.title ?? null) : null,
    blogSlug: e.linked_blog_id ? (blogById.get(e.linked_blog_id)?.slug ?? null) : null,
  }));

  // 月度统计（本月前缀 YYYY-MM）
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((e) => e.date.startsWith(monthPrefix));
  const stats = [
    {
      label: "本月活跃天数",
      value: String(new Set(monthEvents.map((e) => e.date)).size),
      hint: "DISTINCT DAYS",
      icon: Activity,
    },
    {
      label: "进行中项目",
      value: String(inProgressCount ?? 0),
      hint: "IN PROGRESS",
      icon: Rocket,
    },
    {
      label: "本月发文",
      value: String(monthEvents.filter((e) => e.event_type === "blog_post").length),
      hint: "BLOG POSTS",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// DEV CALENDAR"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">开发日历</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          项目里程碑、文章发布与手动记录的时间线
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 全年热力图 */}
      <section className="clip-corner border border-border bg-card p-5">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          全年活跃热力
        </h2>
        <div className="mt-3">
          <Heatmap events={events} />
        </div>
      </section>

      {/* 月度统计 */}
      <section className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="clip-corner border border-border bg-card p-4"
          >
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <stat.icon className="size-3.5" />
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-primary">
              {stat.value}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {stat.hint}
            </p>
          </div>
        ))}
      </section>

      {/* 日历 + 快速记录 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="clip-corner border border-border bg-card p-4 lg:col-span-2">
          <CalendarView events={viewEvents} />
        </section>
        <QuickRecord projects={projects} />
      </div>
    </div>
  );
}
