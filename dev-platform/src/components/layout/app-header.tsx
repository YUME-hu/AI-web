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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground md:hidden"
        aria-label="打开菜单"
      >
        <Menu className="size-5" />
      </button>

      {/* 当前位置 */}
      <div className="flex items-center gap-2 font-mono text-sm">
        <span className="text-primary">▸</span>
        <span className="text-muted-foreground">{pathname}</span>
        <span className="text-border">|</span>
        <span className="text-foreground">{resolveTitle(pathname)}</span>
      </div>

      {/* 右侧状态区 */}
      <div className="ml-auto flex items-center gap-4">
        <AuthButton />
        <span className="hidden font-mono text-[10px] tracking-widest text-muted-foreground sm:block">
          TACTICAL CONSOLE
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-success">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          READY
        </span>
      </div>
    </header>
  );
}
