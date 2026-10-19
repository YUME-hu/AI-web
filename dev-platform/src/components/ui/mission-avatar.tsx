"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 任务头像（Mission Avatar）
 *
 * - 六边形裁切，与侧栏 `MissionBadge` 同一套几何语言（禁止圆形）
 * - 1px 炭黑描边；右下角一枚 4px 铆钉
 * - 默认去色高对比，hover 恢复彩色，模拟老档案屏幕
 * - 无 `src` → 姓名首字母；连姓名都没有 → 十字准星（纯 CSS）
 * - 图片 404 / 加载失败 → `onError` 自动降级到同一个占位符
 */
export function MissionAvatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  const safeName = (name ?? "").trim();
  const initial = safeName.charAt(0).toUpperCase();
  const showImage = Boolean(src) && !broken;
  const initialSize = Math.max(10, Math.round(size * 0.42));

  return (
    <div
      className={cn("np-avatar", className)}
      style={{ width: size, height: size }}
      title={safeName || undefined}
    >
      <div className="np-avatar-hex" aria-hidden />
      <div className="np-avatar-hex-inner">
        {showImage ? (
          // 头像是用户填的任意外链，无法预知域名，故用原生 img（不走 next/image 的 remotePatterns）
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src as string}
            alt={safeName ? `${safeName} 的头像` : "个人头像"}
            className="np-avatar-img"
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : initial ? (
          <span
            className="np-avatar-initial"
            style={{ fontSize: initialSize }}
            aria-label={safeName}
          >
            {initial}
          </span>
        ) : (
          <span className="np-avatar-cross" aria-hidden />
        )}
      </div>
      <span className="np-avatar-rivet" aria-hidden />
    </div>
  );
}
