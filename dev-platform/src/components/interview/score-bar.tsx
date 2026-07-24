import { cn } from "@/lib/utils";

/** 评分条（纯展示）：≥8 绿 / ≥6 琥珀 / <6 红，面试模块共用 */
export function ScoreBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const tier =
    value >= 8 ? "success" : value >= 6 ? "accent" : "destructive";
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tier === "success"
              ? "bg-success"
              : tier === "accent"
                ? "bg-accent"
                : "bg-destructive",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={cn(
          "w-8 shrink-0 text-right font-mono text-xs font-bold",
          tier === "success"
            ? "text-success"
            : tier === "accent"
              ? "text-accent"
              : "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
