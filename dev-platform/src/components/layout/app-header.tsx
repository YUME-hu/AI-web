"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { AuthButton } from "./auth-button";

function resolveTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title ?? "页面";
}

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground md:hidden"
        aria-label="打开菜单"
      >
        <Menu className="size-5" />
      </button>

      {/* 当前位置：纯终端路径式（根路径不重复输出斜杠） */}
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
        {pathname !== "/" && (
          <>
            <span className="text-muted-foreground">{pathname}</span>
            <span className="text-muted-foreground opacity-50">/</span>
          </>
        )}
        <span className="text-foreground">{resolveTitle(pathname)}</span>
      </div>

      {/* 右侧状态区 */}
      <div className="ml-auto flex items-center gap-4">
        <AuthButton />
        <span className="hidden font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase sm:inline">
          <span className="text-foreground">{">_"}</span> TACTICAL_CONSOLE
        </span>
        {/* 状态灯：去掉 animate-ping，静态 LED 更符合工业件 */}
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-success uppercase">
          <span className="size-[5px] shrink-0 rounded-full bg-success" />
          READY
        </span>
      </div>
    </header>
  );
}
