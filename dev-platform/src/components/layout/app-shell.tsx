"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

/**
 * 应用外壳：左侧导航 + 顶部 Header + 主内容区
 * 客户端组件仅负责布局交互（移动端抽屉），children 仍为服务端渲染
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 顶部固定 NASA 复古四色条：4px，fixed 不占布局流 */}
      <div className="nasa-bar fixed inset-x-0 top-0 z-[60]" aria-hidden />

      {/* pt-1 给四色条留出 4px，避免遮住内容 */}
      <div className="blueprint-grid flex h-dvh overflow-hidden bg-background pt-1">
        <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          {/* 蓝图网格由外壳统一提供，主区不再单独铺底纹 */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
