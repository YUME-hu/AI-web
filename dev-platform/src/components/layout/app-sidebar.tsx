"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { MissionAvatar } from "@/components/ui/mission-avatar";
import { MissionBadge } from "./mission-badge";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 两位编号：01..08，取自全站导航顺序而非分组内序号 */
function codeOf(href: string) {
  const index = NAV_ITEMS.findIndex((item) => item.href === href);
  return String(index < 0 ? 99 : index + 1).padStart(2, "0");
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
      <ul className="space-y-px">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  // 左侧 4px 导轨：激活时是警示红，否则完全透明（保持对齐不跳动）
                  "group flex items-baseline gap-2.5 border-l-4 py-2 pr-2 pl-2.5",
                  active
                    ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-transparent text-muted-foreground hover:border-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {/* 编号：等宽，比中文大 2px；非激活态为炭黑 */}
                <span
                  className={cn(
                    "shrink-0 font-mono text-[15px] leading-none font-bold tracking-wider tabular-nums",
                    active ? "text-sidebar-accent-foreground" : "text-foreground",
                  )}
                >
                  [{codeOf(item.href)}]
                </span>
                <span className="text-[13px] leading-none tracking-wide">
                  {item.title}
                </span>
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
  // 登录后才显示管理分组（初始为 false，避免管理入口对访客闪现）
  const [loggedIn, setLoggedIn] = useState(false);
  // 操作员档案（公开数据，用于侧栏底部的头像 + 名称）
  const [profile, setProfile] = useState<
    Pick<Profile, "name" | "avatar_url"> | null
  >(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 操作员档案（公开接口，用于侧栏底部的头像 + 名称；失败则保留占位）
  useEffect(() => {
    let alive = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.profile) {
          setProfile({
            name: d.profile.name ?? null,
            avatar_url: d.profile.avatar_url ?? null,
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const content = (
    <div className="flex h-full flex-col">
      {/* 徽章区：任务徽章 + 字标 + 编制信息 */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <MissionBadge className="size-[30px] shrink-0" />
        <div className="min-w-0 leading-none">
          <p className="font-mono text-[12px] font-bold tracking-[0.2em] whitespace-nowrap text-foreground uppercase">
            DEV<span className="text-foreground">_</span>PLATFORM
          </p>
          <p className="mt-1.5 font-mono text-[8px] tracking-[0.16em] whitespace-nowrap text-muted-foreground uppercase">
            EST. 2026 <span className="opacity-60">{"//"}</span> SYS.ONLINE
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
        <NavGroup
          label="公开 // Public"
          adminOnly={false}
          pathname={pathname}
          onNavigate={onClose}
        />
        {loggedIn && (
          <NavGroup
            label="管理 // Admin"
            adminOnly
            pathname={pathname}
            onNavigate={onClose}
          />
        )}
      </nav>

      {/* 底部：操作员档案 + 系统状态 */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MissionAvatar
            src={profile?.avatar_url}
            name={profile?.name}
            size={32}
          />
          <div className="min-w-0 leading-none">
            <p className="truncate font-mono text-[11px] font-bold tracking-[0.1em] text-foreground uppercase">
              {profile?.name || "OPERATOR"}
            </p>
            <p className="mt-1.5 font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
              [ADMIN]
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
          <span className="size-[5px] shrink-0 bg-success" aria-hidden />
          SYS.ONLINE
          <span className="opacity-50">{"//"}</span> v0.1.0
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
