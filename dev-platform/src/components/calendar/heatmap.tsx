import { cn } from "@/lib/utils";

/**
 * GitHub 风格全年贡献热力图（纯展示，server/client 均可，Phase 9 首页复用）
 * 53 列（周）x 7 行（天），按当天事件数分 5 档
 * 色阶：《星空》辅助色板 —— 低活跃度沙色 #DBA972，高活跃度信标蓝 #21467A，不用红色
 */

const LEVEL_CLASS = [
  "bg-muted", // 空白日：极淡底
  "bg-chart-sand/35",
  "bg-chart-sand",
  "bg-chart-blue/50",
  "bg-chart-blue",
] as const;

function levelOf(count: number): number {
  if (count <= 0) return 0;
  if (count >= 4) return 4;
  return count;
}

/** Date → YYYY-MM-DD（本地时区，手动拼避免 toISOString 时区偏移） */
function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface DayCell {
  key: string;
  count: number;
  future: boolean;
  monthStart: boolean;
}

export function Heatmap({ events }: { events: { date: string }[] }) {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
  }

  // 终点：今天；起点：364 天前再回退到周日（GitHub 布局周日开头）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const weeks: DayCell[][] = [];
  const cursor = new Date(start);
  let prevMonth = -1;
  while (cursor <= today) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dateKey(cursor);
      const monthStart = cursor.getMonth() !== prevMonth;
      if (monthStart) prevMonth = cursor.getMonth();
      week.push({
        key,
        count: counts.get(key) ?? 0,
        future: cursor > today,
        monthStart,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-block">
        {/* 月份标签：月份变化处的列上方 */}
        <div className="flex gap-[2px]">
          {weeks.map((week, i) => (
            <span
              key={i}
              className="w-[10px] shrink-0 overflow-visible font-mono text-[10px] whitespace-nowrap text-muted-foreground"
            >
              {week[0].monthStart
                ? `${Number(week[0].key.slice(5, 7))}月`
                : ""}
            </span>
          ))}
        </div>
        {/* 网格：直角小方块，2px 间距 */}
        <div className="mt-1 flex gap-[2px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex shrink-0 flex-col gap-[2px]">
              {week.map((day) => (
                <div
                  key={day.key}
                  title={`${day.key} · ${day.count} 个事件`}
                  className={cn(
                    "size-[10px] rounded-none",
                    day.future ? "bg-transparent" : LEVEL_CLASS[levelOf(day.count)],
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        {/* 图例 */}
        <div className="mt-2 flex items-center justify-end gap-1 font-mono text-[10px] text-muted-foreground">
          少
          {LEVEL_CLASS.map((cls, i) => (
            <span key={i} className={cn("size-[10px] rounded-none", cls)} />
          ))}
          多
        </div>
      </div>
    </div>
  );
}
