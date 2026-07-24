"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileBadge,
  FileText,
  FolderKanban,
  Hexagon,
  Home,
  MessageSquare,
  Settings,
  Swords,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/": Home,
  "/projects": FolderKanban,
  "/blog": FileText,
  "/chat": MessageSquare,
  "/resume": FileBadge,
  "/interview": Swords,
  "/calendar": Calendar,
  "/settings": Settings,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({
  label,
  adminOnly,
  pathname,
  onNavigate,
}: {
  label: string;
  adminOnly: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => item.adminOnly === adminOnly);

  return (
    <div className="px-3">
      <p className="mb-2 px-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? Hexagon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 border-l-2 px-2 py-2 text-sm transition-colors",
                  active
                    ? "border-primary bg-sidebar-accent text-primary"
                    : "border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.title}</span>
                {active && (
                  <span className="ml-auto font-mono text-[10px] text-primary">
                    ▸
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo 区 */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
        <Hexagon className="size-5 text-primary" />
        <div className="leading-tight">
          <p className="font-mono text-sm font-bold tracking-wider text-foreground">
            DEV<span className="text-primary">_</span>PLATFORM
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            PERSONAL CONSOLE
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground md:hidden"
          aria-label="关闭菜单"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-6 overflow-y-auto py-5">
        <NavGroup label="公开 // Public" adminOnly={false} pathname={pathname} onNavigate={onClose} />
        <NavGroup label="管理 // Admin" adminOnly pathname={pathname} onNavigate={onClose} />
      </nav>

      {/* 底部状态 */}
      <div className="shrink-0 border-t border-sidebar-border px-5 py-3">
        <p className="font-mono text-[10px] text-muted-foreground">
          <span className="text-success">●</span> SYS.ONLINE{" "}
          <span className="text-primary">//</span> v0.1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端固定侧栏 */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        {content}
      </aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
