const STATS = [
  { label: "项目总数", value: "—", hint: "PHASE 1 接入" },
  { label: "文章数", value: "—", hint: "PHASE 3 接入" },
  { label: "开发天数", value: "—", hint: "PHASE 4 接入" },
  { label: "本月活跃", value: "—", hint: "PHASE 4 接入" },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero 占位：Phase 9 完善 */}
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// PERSONAL DEVELOPER PLATFORM"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          个人开发者平台
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          AI 驱动的求职闭环平台：项目库 → JD 分析 → 技能缺口 → 面试准备 →
          智能简历。工程骨架已就绪，模块数据将在后续阶段接入。
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      {/* 数据概览占位卡 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="clip-corner border border-border bg-card p-4"
          >
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
    </div>
  );
}
