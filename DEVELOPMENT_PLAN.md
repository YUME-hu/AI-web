# 个人开发者平台 — 分阶段开发计划

> 基于 `PRD_v2.md` 生成 | 总工期约 24–26 天（4 周）
> 原则：先骨架后血肉、先核心后增强、每阶段可独立交付

---

## 阶段总览

| 阶段 | 内容 | 工期 | 优先级 | 交付物 |
|------|------|------|--------|--------|
| Phase 0 | 项目初始化 | 1 天 | P0 | 可运行的空壳工程 |
| Phase 1 | 项目库 + 认证 | 3 天 | P0 | 可登录、可导入/浏览项目 |
| Phase 2 | 智能简历生成器 | 4 天 | P0 | JD → 简历 → PDF 闭环 |
| Phase 3 | 博客系统 | 2 天 | P1 | 可写、可公开读博客 |
| Phase 4 | 开发日历 | 2 天 | P1 | 日历视图 + 热力图 |
| Phase 5 | AI 知识助手 (RAG) | 3 天 | P2 | 语义搜索 + 流式问答 |
| Phase 6 | Token 监控中心 | 1 天 | P3 | 用量可观测 + 限流 |
| Phase 7 | AI 项目生成器 | 2 天 | P2 | 缺口分析 + 项目推荐 |
| Phase 8 | AI 面试教练 | 3 天 | P2 | 题库 + 模拟面试闭环 |
| Phase 9 | 首页 Dashboard | 1 天 | P1 | 完整首页 |
| Phase 10 | 部署与优化 | 1–2 天 | P3 | 线上可访问平台 |

**MVP 快速路线（2 周）**：Phase 0 → 1 → 2 → 3 → 9 → 10
**完整版（4 周）**：按上表顺序全部完成

---

## Phase 0：项目初始化（Day 1）

**目标**：搭好工程骨架，约定全局规范，后续模块只管往里填。

- [ ] `create-next-app` 初始化：Next.js 14 (App Router) + TypeScript + Tailwind CSS 4
- [ ] 创建 Supabase 项目，拿到 URL / anon key / service key，配置 `.env.local`
- [ ] 安装并初始化 shadcn/ui，装齐核心依赖（Tiptap、react-big-calendar、Recharts、@react-pdf/renderer 等按需安装即可，不要一次全装）
- [ ] 全局暗色主题：按 PRD §1.3 配色表写 CSS 变量（`#0D1117` 背景 / `#00D4FF` 主强调 / 4-6px 圆角）
- [ ] 基础布局组件：左侧导航 + 顶部 Header + 主内容区（含公开区/管理区两种布局）
- [ ] 封装 DeepSeek API 调用客户端（`lib/deepseek.ts`）：统一错误处理、超时、重试
- [ ] Git 初始化 + 首次提交，配置 ESLint / Prettier

**验收**：`pnpm dev` 能打开带暗色主题和导航布局的首页。

---

## Phase 1：项目库 + 认证（Day 2–4）⭐ 数据中枢

**目标**：整个平台的数据基础，所有 AI 模块都依赖项目库数据。

- [ ] 执行 PRD §5.1 全部建表 SQL（projects / blog_posts / calendar_events / resumes 等一次建好，pgvector 扩展先启用）
- [ ] Supabase Auth：GitHub OAuth 登录 + Next.js 中间件鉴权（区分公开路由 / 管理员路由，见 PRD §6）
- [ ] RLS 策略初版：公开表只读、管理员可写（单人平台可简化为单管理员 UID 校验）
- [ ] 项目 CRUD API Routes + 列表页（卡片布局、按名称/标签/技术栈/时间筛选）
- [ ] 项目详情页（公开访问）+ 编辑页（管理员）
- [ ] 智能导入：上传 README.md → DeepSeek 解析（用 PRD §模块二的 Prompt）→ 预填表单 → **用户确认后才入库**（对应风险表第 1 条）
- [ ] 项目状态流转：进行中 / 已完成 / 已归档

**验收**：登录后上传一份真实 README 能解析入库；未登录访客可浏览项目列表和详情。

---

## Phase 2：智能简历生成器（Day 5–9）⭐ 核心闭环

**目标**：完成 PRD §1.2 价值链的主干，这是平台存在的核心理由。

- [ ] `/resume` JD 输入页 → JD 分析 API（PRD §3.3 Prompt）→ 结果存入 `resumes.jd_analysis`
- [ ] 项目匹配 API：全量项目打分排序（PRD §3.4 Prompt），前端展示匹配度百分比
- [ ] 描述润色：选中 Top N 项目，AI 针对岗位重写描述
- [ ] AI 自评 API（PRD §3.5 Prompt）：打分 + 优化建议展示
- [ ] 简历预览页：可视化编辑、调整项目顺序、手动修改（差异存入 `user_modifications`，用于 Prompt 迭代）
- [ ] PDF 导出：@react-pdf/renderer 前端生成，ATS 友好单栏模板（参考 open-resume）
- [ ] 多版本管理：`/resume/history` 保存/对比不同岗位的简历版本

**验收**：粘贴真实 JD 后 2 分钟内产出一份可编辑、可导出 PDF 的定制简历，版本可回溯。

---

## Phase 3：博客系统（Day 10–11）

**目标**：对外展示窗口，可写进简历的内容资产。

- [ ] 博客 CRUD API + Tiptap Markdown 编辑器（代码高亮）
- [ ] 三分类（想法/生活/技术笔记）+ 跨分类标签 + 关联项目
- [ ] 博客列表页 / 详情页（公开），SSG + ISR 静态化已发布文章
- [ ] SEO：meta / sitemap / robots；RSS feed 自动生成
- [ ] 复用策略：参考 tailwind-nextjs-starter-blog 的渲染管线与 SEO 配置，存储改为数据库驱动

**验收**：发布一篇带代码块的文章，访客可访问，RSS 和 sitemap 可抓取。

---

## Phase 4：开发日历（Day 12–13）

**目标**：开发轨迹可视化，差异化亮点。

- [ ] react-big-calendar 月/周/日三视图 + 明日方舟暗色定制
- [ ] 事件自动映射：项目开始/结束、博客发布自动写入 `calendar_events`
- [ ] "今天做了什么"手动快速记录，可关联项目
- [ ] GitHub 风格全年热力图（自绘 SVG 网格即可，不必引库）
- [ ] 月度统计卡片：活跃天数 / 项目进度 / 发文数

**验收**：新建项目和发布博客后日历自动出现对应事件；热力图数据与日历一致。

---

## Phase 5：AI 知识助手 RAG（Day 14–17）⭐ 简历加分

**目标**：AI 应用工程能力的直接证明。

- [ ] **先确认 DeepSeek Embedding 模型输出维度，再核对 `embeddings` 表 VECTOR(1536) 是否匹配**（对应风险表第 2 条）
- [ ] 分块（Chunking）策略：项目描述、博客正文按段落/标题切分，写入 pgvector
- [ ] 语义搜索 API：query 向量化 → 余弦相似度 Top-K 召回
- [ ] `/chat` 对话界面：消息列表 + 多轮上下文（`chat_sessions` 按 session_id 记忆）
- [ ] SSE 流式响应：DeepSeek streaming + 打字机效果
- [ ] 引用标注：回答附来源（哪个项目/哪篇文章，可点击跳转）
- [ ] 自动索引：项目/博客新增或修改时触发重新 Embedding

**验收**：访客问"你做过哪些 React 项目？"能得到流式回答并标注来源。

---

## Phase 6：Token 监控中心（Day 18）

**目标**：AI 调用可观测、成本可控。注意：**用量记录中间件应在此阶段回头包住 Phase 1/2/5 已有的所有 AI 调用**。

- [ ] 在 `lib/deepseek.ts` 加统一用量记录（module / tokens / 耗时 / 成本 → `ai_usage_logs`）
- [ ] `/settings/usage` 统计面板：按日/周/月图表（Recharts）+ 按模块占比
- [ ] 调用日志列表（Prompt 摘要 + 响应摘要）
- [ ] 限流：单日 Token 上限，超限拒绝并提示

**验收**：面板数据与实际 AI 调用一致；超过设定上限后调用被拒。

---

## Phase 7：AI 项目生成器（Day 19–20）⭐ 简历加分

**目标**：补齐"JD 分析 → 缺口 → 行动"的最后一环。

- [ ] 技能缺口分析 API：JD 要求技能 vs 项目库已有技能对比
- [ ] 项目方案生成 API（PRD §9.3 Prompt）→ 存入 `recommended_projects`
- [ ] `/projects/recommended` 页面：展示方案、保存为"计划中"、忽略
- [ ] 状态流转：计划 → 进行 → 完成 → 转为正式项目（`converted_project_id` 回填）
- [ ] 学习路径：AI 生成推荐资源列表

**验收**：从一份 JD 出发能拿到缺口清单和至少 1 个完整项目方案，可保存并流转状态。

---

## Phase 8：AI 面试教练（Day 21–24）⭐ 简历加分

**目标**：多轮对话 + AI 评估能力展示，求职实用工具。

- [ ] 面试题生成 API（PRD §10.3 Prompt）：基于 JD + 项目库生成 4 类题目 → `interview_questions`
- [ ] 题库页：分类 + 难度筛选 + 收藏（status: new/practiced/mastered）
- [ ] 单题练习：用户作答 → AI 按 STAR 法则反馈
- [ ] 模拟面试：多轮对话（PRD §10.4 System Prompt），会话存入 `mock_interviews.conversation`
- [ ] 评估报告：面试结束调用 PRD §10.5 Prompt，生成维度评分报告页
- [ ] 练习记录：历史回答与反馈可回顾

**验收**：完成一场 8–10 轮模拟面试并拿到评估报告；题目收藏状态持久化。

---

## Phase 9：首页 Dashboard（Day 25）

**目标**：对外第一印象，聚合已有模块数据。**故意排后**：依赖前面各模块的数据才能聚合。

- [ ] Hero 区域：个人简介 + 技能标签 + 社交链接（数据来自设置模块）
- [ ] 4 个数据概览卡：项目总数 / 文章数 / 开发天数 / 本月活跃
- [ ] 嵌入开发热力图（复用 Phase 4 组件）
- [ ] 最近动态时间线：新项目 + 新文章 + 日历记录聚合，最近 10 条
- [ ] 快速入口卡片：导入项目 / 写博客 / 生成简历 / 面试练习

**验收**：首页数据与各模块实际数据一致，无需手动维护。

---

## Phase 10：部署与优化（Day 26–27）

**目标**：上线 + 收尾。

- [ ] Vercel 部署：环境变量、构建通过
- [ ] Supabase 生产检查：RLS 策略复核、备份开启
- [ ] SEO 收尾：sitemap / robots / OG 图
- [ ] 性能：图片懒加载、ISR 缓存、减少不必要 SSR（对应 Vercel 额度风险）
- [ ] PDF 导出在 Serverless 下实测（超时则改为纯前端生成，对应风险表第 5 条）
- [ ] 移动端响应式走查（桌面优先，移动基本可用即可）
- [ ] （可选）绑定自定义域名
- [ ] 对照 PRD §十 验收标准逐项打勾

**验收**：公开 URL 可访问，PRD 验收清单 16 项全部通过。

---

## 关键依赖关系

```
Phase 0 (骨架)
  └─→ Phase 1 (项目库) ──→ Phase 2 (简历) ──→ Phase 7 (缺口分析，依赖简历的 JD 分析)
        │                      │
        ├─→ Phase 3 (博客) ────┴─→ Phase 5 (RAG，依赖项目+博客内容)
        │                      └─→ Phase 8 (面试，依赖 JD 分析 + 项目库)
        ├─→ Phase 4 (日历，聚合项目/博客事件)
        └─→ Phase 6 (Token 监控，包住所有 AI 调用)
Phase 9 (首页) 依赖 Phase 1/3/4 的数据
Phase 10 (部署) 永远最后
```

调整顺序时遵守：项目库永远最先做；Phase 5/7/8 三个 AI 增强模块互相独立，可按时间余量任意裁剪。

## 全局风险检查点

| 时机 | 检查项 |
|------|--------|
| Phase 0 末 | DeepSeek API Key 可用、有余额 |
| Phase 1 | AI 解析结果必须人工确认后入库 |
| Phase 5 开工前 | Embedding 维度与 pgvector 表定义匹配 |
| Phase 6 | 所有历史 AI 调用点都已接入用量记录 |
| Phase 10 | PDF 导出、Vercel/Supabase 免费额度实测 |
