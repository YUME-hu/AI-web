# 个人开发者平台（dev-platform）

AI 驱动的求职闭环平台：项目库 → JD 分析 → 技能缺口 → AI 面试教练 → 智能简历 PDF，外加博客、开发日历、RAG 知识助手与 Token 监控。既是对外展示的个人门户，也是对内管理开发资产与求职准备的工作台。

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **UI**：Tailwind CSS 4 + shadcn/ui，明日方舟纯暗色风格
- **数据库 / 认证**：Supabase（PostgreSQL + Auth + pgvector）
- **AI**：DeepSeek API（`deepseek-v4-flash` 非思考模式）
- **Embedding**：SiliconFlow BGE-M3（1024 维，RAG 用）
- **PDF**：@react-pdf/renderer（ATS 友好简历导出）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local   # 然后按下表填写

# 3. 初始化数据库（Supabase SQL Editor 依次执行）
#    supabase/schema.sql → supabase/rls.sql

# 4. 启动开发服务器
npm run dev
```

首次使用 AI 知识助手前，登录后调用一次 `POST /api/admin/reindex` 为存量项目/博客建立向量索引。

## 环境变量

| 变量 | 说明 | 获取 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名公钥 | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | service 密钥（仅服务端） | 同上 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | platform.deepseek.com |
| `SILICONFLOW_API_KEY` | SiliconFlow Key（Embedding） | cloud.siliconflow.cn |
| `ADMIN_USER_ID` | 管理员 UID（可选，不填则任何登录用户都是管理员） | Authentication → Users |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL（RSS/sitemap 用） | 本地 `http://localhost:3000` |
| `DAILY_TOKEN_LIMIT` | 单日 AI Token 上限（默认 500000） | — |

## 常用命令

```bash
npm run dev     # 开发
npm run build   # 生产构建
npm run lint    # ESLint
npx tsc --noEmit  # 类型检查
```

## 目录结构（要点）

```
src/
├── app/
│   ├── (main)/            # 带外壳布局的页面（首页/项目/博客/简历/面试/日历/chat/设置）
│   ├── api/               # Route Handlers（projects/blog/resumes/interview/chat/search/usage 等）
│   ├── login/             # 独立登录页（无外壳）
│   └── auth/callback/     # OAuth 回调
├── components/            # layout / projects / blog / resume / interview / calendar / chat / settings / ui
├── lib/                   # deepseek / embedding / rag / supabase / prompts / usage / types 等
└── middleware.ts          # 会话刷新 + 管理路由鉴权
supabase/
├── schema.sql             # 全部建表 SQL + 向量检索函数
└── rls.sql                # 行级安全策略
```

## 部署

见根目录 `DEPLOYMENT.md`（Supabase / GitHub OAuth / Vercel 全流程 + 验收清单）。
