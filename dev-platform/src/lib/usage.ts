/**
 * Phase 6 用量统计共享查询（服务端）
 * api/usage 路由与 /settings/usage 页面共用
 */
import { createServiceClient } from "./supabase/service";
import type {
  UsageDailyPoint,
  UsageLogItem,
  UsageModulePoint,
  UsageStats,
  UsageSummary,
} from "./types";

interface UsageRow {
  module: string;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

/** Date → 本地 YYYY-MM-DD */
function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function summarize(rows: UsageRow[]): UsageSummary {
  return {
    tokens: rows.reduce((s, r) => s + r.total_tokens, 0),
    cost: round4(rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)),
    calls: rows.length,
  };
}

export async function getUsageStats(): Promise<UsageStats> {
  const supabase = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  // 近 7 天 / 近 30 天（均含今天）
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 29);

  // 一次取近 30 天全量日志，today/week/month/daily/byModule 均在内存聚合
  const [{ data: monthData }, { data: recentData }] = await Promise.all([
    supabase
      .from("ai_usage_logs")
      .select("module, total_tokens, cost_usd, created_at")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("ai_usage_logs")
      .select("module, total_tokens, cost_usd, duration_ms, model, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const monthRows = (monthData ?? []) as UsageRow[];
  const todayRows = monthRows.filter(
    (r) => new Date(r.created_at) >= todayStart,
  );
  const weekRows = monthRows.filter(
    (r) => new Date(r.created_at) >= weekStart,
  );

  // 近 30 天每天（补零）
  const dayMap = new Map<string, { tokens: number; cost: number }>();
  for (const r of monthRows) {
    const key = dateKey(new Date(r.created_at));
    const prev = dayMap.get(key) ?? { tokens: 0, cost: 0 };
    prev.tokens += r.total_tokens;
    prev.cost += Number(r.cost_usd ?? 0);
    dayMap.set(key, prev);
  }
  const daily: UsageDailyPoint[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= now) {
    const key = dateKey(cursor);
    const point = dayMap.get(key);
    daily.push({
      date: key,
      tokens: point?.tokens ?? 0,
      cost: round4(point?.cost ?? 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // 近 30 天按模块聚合
  const moduleMap = new Map<string, { tokens: number; cost: number; calls: number }>();
  for (const r of monthRows) {
    const prev = moduleMap.get(r.module) ?? { tokens: 0, cost: 0, calls: 0 };
    prev.tokens += r.total_tokens;
    prev.cost += Number(r.cost_usd ?? 0);
    prev.calls += 1;
    moduleMap.set(r.module, prev);
  }
  const byModule: UsageModulePoint[] = [...moduleMap.entries()]
    .map(([module, v]) => ({
      module,
      tokens: v.tokens,
      cost: round4(v.cost),
      calls: v.calls,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  const today = summarize(todayRows);

  return {
    today,
    week: summarize(weekRows),
    month: summarize(monthRows),
    daily,
    byModule,
    recent: (recentData ?? []) as UsageLogItem[],
    dailyLimit: {
      limit: Number(process.env.DAILY_TOKEN_LIMIT ?? 500_000),
      used: today.tokens,
    },
  };
}
