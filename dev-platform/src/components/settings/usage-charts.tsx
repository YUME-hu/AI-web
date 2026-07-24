"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AI_MODULE_LABELS, type AiModule, type UsageDailyPoint, type UsageModulePoint } from "@/lib/types";

/** 模块五色：青/琥珀/绿/紫/灰 */
const MODULE_COLORS = ["#00d4ff", "#ff8c00", "#00b578", "#8b5cf6", "#8b949e"];

const TOOLTIP_STYLE = {
  backgroundColor: "#21262d",
  border: "1px solid #30363d",
  borderRadius: 2,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
};
const TOOLTIP_LABEL_STYLE = { color: "#8b949e", marginBottom: 4 };

function moduleLabel(module: string): string {
  return AI_MODULE_LABELS[module as AiModule] ?? module;
}

export function UsageCharts({
  daily,
  byModule,
}: {
  daily: UsageDailyPoint[];
  byModule: UsageModulePoint[];
}) {
  const totalTokens = byModule.reduce((s, m) => s + m.tokens, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 近 30 天 Token 消耗柱状图 */}
      <section className="clip-corner border border-border bg-card p-5">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          近 30 天 Token 消耗
        </h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#30363d" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#8b949e", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={{ stroke: "#30363d" }}
                tickFormatter={(v: string) => v.slice(5)}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8b949e", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                cursor={{ fill: "#00d4ff10" }}
                formatter={(value) => [`${Number(value).toLocaleString()} tokens`, "消耗"]}
              />
              <Bar dataKey="tokens" fill="#00d4ff" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 模块占比 donut */}
      <section className="clip-corner border border-border bg-card p-5">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          模块占比（近 30 天）
        </h3>
        {byModule.length > 0 ? (
          <>
            <div className="relative mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byModule}
                    dataKey="tokens"
                    nameKey="module"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {byModule.map((_, i) => (
                      <Cell key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString()} tokens`,
                      moduleLabel(String(name)),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* 中心总量 */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold text-primary">
                  {totalTokens.toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  TOTAL TOKENS
                </span>
              </div>
            </div>
            {/* 自定义图例 */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {byModule.map((m, i) => (
                <span
                  key={m.module}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"
                >
                  <span
                    className="size-2 rounded-[1px]"
                    style={{ backgroundColor: MODULE_COLORS[i % MODULE_COLORS.length] }}
                  />
                  {moduleLabel(m.module)} · {Math.round((m.tokens / totalTokens) * 100)}%
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="py-20 text-center font-mono text-xs text-muted-foreground">
            {"// 近 30 天暂无调用记录"}
          </p>
        )}
      </section>
    </div>
  );
}
