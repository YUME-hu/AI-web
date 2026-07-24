import Link from "next/link";
import {
  Calendar,
  FileBadge,
  FileText,
  FileUp,
  FolderGit2,
  FolderKanban,
  Globe,
  Hexagon,
  Mail,
  PenLine,
  Swords,
} from "lucide-react";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { Heatmap } from "@/components/calendar/heatmap";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TimelineItem = {
  type: "project" | "blog" | "event";
  title: string;
  time: string;
  href: string | null;
};

const TIMELINE_META = {
  project: { icon: FolderKanban, color: "text-primary", dot: "border-primary" },
  blog: { icon: FileText, color: "text-accent", dot: "border-accent" },
  event: { icon: Calendar, color: "text-muted-foreground", dot: "border-muted-foreground" },
} as const;

const QUICK_LINKS = [
  {
    href: "/projects/import",
    icon: FileUp,
    title: "导入项目",
    description: "README 一键解析入库",
  },
  {
    href: "/blog/new",
    icon: PenLine,
    title: "写博客",
    description: "记录技术与生活",
  },
  {
    href: "/resume",
    icon: FileBadge,
    title: "生成简历",
    description: "JD 驱动的简历向导",
  },
  {
    href: "/interview",
    icon: Swords,
    title: "面试练习",
    description: "AI 面试官全流程对练",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  // 全部数据并行获取
  const [
    profile,
    admin,
    { count: projectCount },
    { count: postCount },
    { data: events },
    { data: recentProjects },
    { data: recentPosts },
  ] = await Promise.all([
    getProfile(),
    isAdmin(),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("calendar_events")
      .select("date, title, event_type")
      .order("date", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("blog_posts")
      .select("slug, title, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  const allEvents = (events ?? []) as {
    date: string;
    title: string;
    event_type: string;
  }[];

  // 统计：开发天数 = 有事件的不同日期数；本月活跃 = 当月事件条数
  const monthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const stats = [
    { label: "项目总数", value: String(projectCount ?? 0), hint: "PROJECTS" },
    { label: "文章数", value: String(postCount ?? 0), hint: "BLOG POSTS" },
    {
      label: "开发天数",
      value: String(new Set(allEvents.map((e) => e.date)).size),
      hint: "ACTIVE DAYS",
    },
    {
      label: "本月活跃",
      value: String(allEvents.filter((e) => e.date.startsWith(monthPrefix)).length),
      hint: "THIS MONTH",
    },
  ];

  // 最近动态：三类合并按时间倒序取前 10
  const timeline: TimelineItem[] = [
    ...((recentProjects ?? []) as { id: string; title: string; created_at: string }[]).map(
      (p) => ({
        type: "project" as const,
        title: p.title,
        time: p.created_at,
        href: `/projects/${p.id}`,
      }),
    ),
    ...((recentPosts ?? []) as { slug: string; title: string; published_at: string | null }[]).map(
      (p) => ({
        type: "blog" as const,
        title: p.title,
        time: p.published_at ?? "",
        href: `/blog/${p.slug}`,
      }),
    ),
    ...allEvents.slice(0, 5).map((e) => ({
      type: "event" as const,
      title: e.title,
      time: e.date,
      href: null,
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 10);

  const name = profile?.name || "开发者";
  const title = profile?.title || "Full-Stack Developer";
  const bio = profile?.bio ?? "";
  const skills = profile?.skills ?? [];
  const socials = [
    { href: profile?.github, icon: FolderGit2, label: "GitHub" },
    { href: profile?.website, icon: Globe, label: "个人网站" },
    { href: profile?.email ? `mailto:${profile.email}` : null, icon: Mail, label: "邮箱" },
  ].filter((s) => !!s.href);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.3em] text-primary">
            {"// PERSONAL DEVELOPER PLATFORM"}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">{name}</h1>
          <p className="text-glow-primary mt-1.5 font-mono text-lg text-primary">
            {title}
          </p>
          {bio && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {bio}
            </p>
          )}
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="outline" className="rounded-sm font-mono text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        {/* 右侧装饰：大六边形 + 网格（纯 CSS） */}
        <div className="bg-grid relative hidden h-44 w-44 shrink-0 items-center justify-center md:flex">
          <Hexagon className="size-36 text-primary/20" strokeWidth={1} />
          <Hexagon className="absolute size-20 text-primary/40" strokeWidth={1} />
          <span className="absolute font-mono text-[10px] tracking-[0.3em] text-primary/60">
            ONLINE
          </span>
        </div>
      </section>

      <div className="divider-tactical" />

      {/* 统计卡 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="clip-corner border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
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

      {/* 热力图 */}
      <section className="clip-corner border border-border bg-card p-5">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
          开发轨迹 <span className="text-primary/60">{"// ACTIVITY"}</span>
        </h2>
        <div className="mt-3">
          <Heatmap events={allEvents} />
        </div>
      </section>

      {/* 最近动态 */}
      <section className="clip-corner border border-border bg-card p-5">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
          最近动态 <span className="text-primary/60">{"// TIMELINE"}</span>
        </h2>
        {timeline.length > 0 ? (
          <div className="relative mt-4 space-y-4 before:absolute before:top-1 before:bottom-1 before:left-[5px] before:w-px before:bg-border">
            {timeline.map((item, i) => {
              const meta = TIMELINE_META[item.type];
              const content = (
                <>
                  <span
                    className={cn(
                      "absolute top-1.5 left-0 size-[11px] rounded-full border-2 bg-background",
                      meta.dot,
                    )}
                  />
                  <div className="flex min-w-0 flex-1 items-baseline gap-3">
                    <meta.icon className={cn("size-3.5 shrink-0 self-center", meta.color)} />
                    <p className="truncate text-sm text-foreground/90 transition-colors group-hover:text-primary">
                      {item.title}
                    </p>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {item.time.slice(0, 10)}
                    </span>
                  </div>
                </>
              );
              return item.href ? (
                <Link key={i} href={item.href} className="group relative flex gap-3 pl-6">
                  {content}
                </Link>
              ) : (
                <div key={i} className="relative flex gap-3 pl-6">
                  {content}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            暂无动态，去创建第一个项目吧
          </p>
        )}
      </section>

      {/* 快速入口（仅登录可见） */}
      {admin && (
        <section>
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
            快速入口 <span className="text-primary/60">{"// QUICK ACTIONS"}</span>
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="clip-corner group border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <link.icon className="size-5 text-primary" />
                <p className="mt-2.5 font-bold transition-colors group-hover:text-primary">
                  {link.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {link.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
