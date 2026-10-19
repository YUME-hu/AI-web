import { redirect } from "next/navigation";
import { Coins, Gauge, TrendingUp, Zap } from "lucide-react";
import { isAdmin } from "@/lib/supabase/server";
import { getUsageStats } from "@/lib/usage";
import {
  AI_MODULE_LABELS,
  type AiModule,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { UsageCharts } from "@/components/settings/usage-charts";

export const metadata = { title: "Token 监控" };

/**
 * 模块徽标配色：与 usage-charts 的 MODULE_COLORS 一一对应。
 * 边框/底纹用分类色区分色相，文字统一炭黑保证 10px 可读性；
 * 旧的紫色 #8b5cf6 等调色板外颜色已清除。
 */
const MODULE_BADGE_STYLE: Record<string, string> = {
  resume: "border-chart-blue bg-chart-blue/10 text-foreground",
  knowledge: "border-chart-orange bg-chart-orange/10 text-foreground",
  project_import: "border-chart-sand bg-chart-sand/25 text-foreground",
  interview: "border-chart-olive bg-chart-olive/15 text-foreground",
  project_generator: "border-chart-slate bg-chart-slate/15 text-foreground",
  blog_assistant: "border-foreground/40 bg-muted text-muted-foreground",
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

function moduleLabel(module: string): string {
  return AI_MODULE_LABELS[module as AiModule] ?? module;
}

export default async function UsagePage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/settings/usage");
  }

  const stats = await getUsageStats();
  const { limit, used } = stats.dailyLimit;
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  // 限额进度条配色：常规信标蓝、>80% 波斯橙、100% 警示红（唯一允许用红的数据状态）
  const barColor =
    percent >= 100
      ? "bg-destructive"
      : percent > 80
        ? "bg-chart-orange"
        : "bg-chart-blue";

  const cards = [
    { label: "今日 Token", value: fmtTokens(stats.today.tokens), hint: `${stats.today.calls} 次调用`, icon: Zap },
    { label: "今日成本", value: fmtCost(stats.today.cost), hint: "USD · 保守估算", icon: Coins },
    { label: "近 7 天 Token", value: fmtTokens(stats.week.tokens), hint: `${stats.week.calls} 次调用`, icon: TrendingUp },
    { label: "近 30 天成本", value: fmtCost(stats.month.cost), hint: `${fmtTokens(stats.month.tokens)} tokens`, icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-foreground">
          {"// TOKEN MONITOR"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Token 监控中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          DeepSeek 调用量与成本追踪，数据来自 ai_usage_logs
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 统计卡 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card-hazard rivet border border-foreground bg-card p-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <card.icon className="size-3.5" />
              {card.label}
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-foreground">
              {card.value}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {card.hint}
            </p>
          </div>
        ))}
      </section>

      {/* 限额进度条 */}
      <section className="card-hazard rivet border border-foreground bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            当日限额
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            <span
              className={cn(
                "font-bold",
                percent >= 100
                  ? "text-destructive"
                  : percent > 80
                    ? "text-chart-orange"
                    : "text-chart-blue",
              )}
            >
              {used.toLocaleString()}
            </span>
            {" / "}
            {limit.toLocaleString()} tokens（{percent.toFixed(1)}%）
          </span>
        </div>
        {/* 进度条：方角、无过渡，工业刻度条 */}
        <div className="mt-3 h-2 w-full border border-foreground bg-muted">
          <div
            className={cn("h-full", barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
        {percent >= 100 && (
          <p className="mt-2 font-mono text-[10px] text-destructive">
            已达当日上限，AI 调用将被拒绝，明日 00:00 重置
          </p>
        )}
      </section>

      {/* 图表 */}
      <UsageCharts daily={stats.daily} byModule={stats.byModule} />

      {/* 调用日志 */}
      <section className="card-hazard rivet border border-foreground bg-card p-5">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          最近 {stats.recent.length} 条调用
        </h3>
        {stats.recent.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            {/* 数据表格：1px 炭黑网格 + 表头米色底 + 行 hover */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted font-mono text-[10px] tracking-[0.14em] uppercase">
                  <th className="border border-foreground px-2 py-2 text-left font-bold">时间</th>
                  <th className="border border-foreground px-2 py-2 text-left font-bold">模块</th>
                  <th className="border border-foreground px-2 py-2 text-right font-bold">Tokens</th>
                  <th className="border border-foreground px-2 py-2 text-right font-bold">成本</th>
                  <th className="border border-foreground px-2 py-2 text-right font-bold">耗时</th>
                  <th className="border border-foreground px-2 py-2 text-left font-bold">模型</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((log, i) => (
                  <tr key={i} className="transition-none hover:bg-muted/60">
                    <td className="border border-foreground px-2 py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {log.created_at.slice(5, 16).replace("T", " ")}
                    </td>
                    <td className="border border-foreground px-2 py-1.5">
                      <span
                        className={cn(
                          "inline-block border px-1.5 py-0.5 font-mono text-[10px]",
                          MODULE_BADGE_STYLE[log.module] ??
                            "border-foreground/40 bg-muted text-muted-foreground",
                        )}
                      >
                        {moduleLabel(log.module)}
                      </span>
                    </td>
                    <td className="border border-foreground px-2 py-1.5 text-right font-mono text-xs">
                      {log.total_tokens.toLocaleString()}
                    </td>
                    <td className="border border-foreground px-2 py-1.5 text-right font-mono text-xs text-muted-foreground">
                      {fmtCost(Number(log.cost_usd ?? 0))}
                    </td>
                    <td className="border border-foreground px-2 py-1.5 text-right font-mono text-xs text-muted-foreground">
                      {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="border border-foreground px-2 py-1.5 font-mono text-xs text-muted-foreground">
                      {log.model ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center font-mono text-xs text-muted-foreground">
            {"// 暂无调用记录"}
          </p>
        )}
      </section>
    </div>
  );
}
