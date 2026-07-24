/**
 * 全站导航配置（对应 PRD §6 路由表）
 * 公开页面访客可见；管理页面需要登录
 */

export interface NavItem {
  title: string;
  href: string;
  /** 是否需要管理员权限（仅登录后显示在导航中） */
  adminOnly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "主页", href: "/", adminOnly: false },
  { title: "项目库", href: "/projects", adminOnly: false },
  { title: "博客", href: "/blog", adminOnly: false },
  { title: "AI 助手", href: "/chat", adminOnly: false },
  { title: "简历生成", href: "/resume", adminOnly: true },
  { title: "面试教练", href: "/interview", adminOnly: true },
  { title: "开发日历", href: "/calendar", adminOnly: true },
  { title: "设置", href: "/settings", adminOnly: true },
];
