import type { Metadata } from "next";
import { Geist, Space_Mono } from "next/font/google";
import "./globals.css";
// 代码高亮暗色主题（rehype-highlight 输出的 hljs 类名），全局引入一次
import "highlight.js/styles/github-dark.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 标题 / 数据 / 编号：等宽 + 全大写，工业仪表盘气质（见 AGENTS.md §2.4）
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "个人开发者平台",
    template: "%s | 个人开发者平台",
  },
  description: "AI 驱动的求职闭环平台：项目库、智能简历、技能缺口分析、AI 面试教练、开发日历、博客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
