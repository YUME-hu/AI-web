import { cn } from "@/lib/utils";

/**
 * 任务徽章（Mission Patch）— NASA-Punk 风格标识
 *
 * 纯 SVG 实现（AGENTS.md §1.4：禁止外部图片）：
 * - 外形用六边形，外圈 1px 炭黑描边，内部填充米白 #ECE5D6
 * - 主图形是"被一道水平切口截断的三角形"，警示红 #D63A2C 填充
 * - 内层 0.6px 细六边形模拟徽章的二次铆接压边
 *
 * 尺寸交给外部 className 控制，viewBox 固定 40×44，缩放不糊。
 */
export function MissionBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 44"
      className={cn("block", className)}
      role="img"
      aria-label="DEV_PLATFORM 任务徽章"
    >
      {/* 六边形主体：外描边 + 米白底 */}
      <polygon
        points="20,1.4 38.2,11.9 38.2,32.9 20,43.4 1.8,32.9 1.8,11.9"
        fill="#ECE5D6"
        stroke="#191919"
        strokeWidth="1.8"
      />

      {/* 内层压边 */}
      <polygon
        points="20,6 34.4,14.3 34.4,30.5 20,38.8 5.6,30.5 5.6,14.3"
        fill="none"
        stroke="#191919"
        strokeWidth="0.6"
        opacity="0.45"
      />

      {/* 被水平切割的三角形：上半段 + 下半段 */}
      <polygon points="20,10.5 25.9,19 14.1,19" fill="#D63A2C" />
      <polygon points="12.6,21.6 27.4,21.6 31.4,27.8 8.6,27.8" fill="#D63A2C" />

      {/* 底部刻度线 */}
      <rect x="16.5" y="31.6" width="7" height="1" fill="#191919" opacity="0.5" />
    </svg>
  );
}
