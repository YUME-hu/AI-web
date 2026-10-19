"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ExternalLink, FolderKanban, X } from "lucide-react";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import "react-big-calendar/lib/css/react-big-calendar.css";

/** 页面服务端 enrich 后的事件（附带关联标题/slug，避免客户端再查库） */
export interface CalendarViewEvent extends CalendarEvent {
  projectTitle?: string | null;
  blogTitle?: string | null;
  blogSlug?: string | null;
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  // 国内习惯周一开头
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { "zh-CN": zhCN },
});

const MESSAGES = {
  month: "月",
  week: "周",
  day: "日",
  today: "今天",
  previous: "‹",
  next: "›",
  allDay: "全天",
  noEventsInRange: "该时间段暂无事件",
  showMore: (total: number) => `+${total} 更多`,
};

interface RbcCalEvent extends RBCEvent {
  resource: CalendarViewEvent;
}

/** 弹层类型徽标配色（与事件条分色一致） */
const TYPE_BADGE_STYLE: Record<CalendarEventType, string> = {
  project_start: "border-chart-blue/50 bg-chart-blue/10 text-chart-blue",
  project_end: "border-success/50 bg-success/10 text-success",
  blog_post: "border-accent/50 bg-accent/10 text-accent",
  manual: "border-border bg-muted text-muted-foreground",
  commit: "border-border bg-muted text-muted-foreground",
  release: "border-border bg-muted text-muted-foreground",
};

function eventPropGetter(event: RbcCalEvent) {
  // 分色样式定义在 globals.css 的 .rbc-event--* 覆盖中
  return { className: `rbc-event--${event.resource.event_type}` };
}

export function CalendarView({ events }: { events: CalendarViewEvent[] }) {
  const [selected, setSelected] = useState<CalendarViewEvent | null>(null);

  const rbcEvents = useMemo<RbcCalEvent[]>(
    () =>
      events.map((e) => ({
        title: e.title,
        // date 列是 YYYY-MM-DD，按本地零点解析避免时区偏移
        start: new Date(`${e.date}T00:00:00`),
        end: new Date(`${e.date}T00:00:00`),
        allDay: true,
        resource: e,
      })),
    [events],
  );

  return (
    <>
      <BigCalendar
        localizer={localizer}
        events={rbcEvents}
        culture="zh-CN"
        views={["month", "week", "day"]}
        defaultView="month"
        messages={MESSAGES}
        eventPropGetter={eventPropGetter}
        onSelectEvent={(e) => setSelected(e.resource)}
        popup
        style={{ height: 620 }}
      />

      {/* 事件详情弹层 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="card-hazard rivet w-full max-w-md border border-foreground bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge
                  variant="outline"
                  className={cn("rounded-sm", TYPE_BADGE_STYLE[selected.event_type])}
                >
                  {CALENDAR_EVENT_TYPE_LABELS[selected.event_type]}
                </Badge>
                <h3 className="mt-3 text-lg font-bold">{selected.title}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {selected.date}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="关闭"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {selected.description && (
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                {selected.description}
              </p>
            )}

            {/* 关联链接 */}
            <div className="mt-4 flex flex-wrap gap-3">
              {selected.linked_project_id && (
                <Link
                  href={`/projects/${selected.linked_project_id}`}
                  className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-chart-blue"
                >
                  <FolderKanban className="size-3.5" />
                  {selected.projectTitle ?? "关联项目"}
                </Link>
              )}
              {selected.blogSlug && (
                <Link
                  href={`/blog/${selected.blogSlug}`}
                  className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-chart-blue"
                >
                  <ExternalLink className="size-3.5" />
                  {selected.blogTitle ?? "关联文章"}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
