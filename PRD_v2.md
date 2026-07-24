# 个人开发者平台 — 产品需求文档（PRD）v2.0

> **版本**: v2.0  
> **日期**: 2026-07-23  
> **状态**: 需求确认中  
> **变更**: 新增 AI 知识助手 / Token 监控 / AI 项目生成器 / AI 面试教练四个模块；新增开源项目复用分析；新增开发计划

---

## 一、项目概述

### 1.1 项目定位

一个面向个人开发者的 AI 驱动求职闭环平台，集项目库、智能简历生成、技能缺口分析、AI 面试教练、开发日历、博客于一体。既是对外展示的个人门户（可写入简历），也是对内管理开发资产与求职准备的工作台。

### 1.2 核心价值主张

```
项目库（你做了什么）
    ↓
JD 分析（你要去哪里）
    ↓
技能缺口分析（差距在哪）──→ AI 项目推荐（补齐缺口）
    ↓
AI 面试教练（怎么准备）
    ↓
智能简历 → PDF → 投递（最终产出）
```

### 1.3 设计风格

**纯暗色 · 明日方舟平面设计风格**

| 维度 | 规范 |
|------|------|
| 主背景 | 深黑蓝 `#0D1117` / `#161B22` |
| 卡片背景 | `#1C2333` / `#21262D` |
| 主强调色 | 青蓝 `#00D4FF` / `#2EA9DF` |
| 次强调色 | 琥珀橙 `#FF8C00` / `#F0A020` |
| 警示色 | 红 `#FF4B4B` |
| 成功色 | 绿 `#00B578` |
| 文字主色 | `#E6EDF3`（高对比白） |
| 文字次色 | `#8B949E`（灰） |
| 形状语言 | 锐角切边、几何线条、极小圆角（4-6px） |
| 字体 | 标题等宽/无衬线粗体，正文无衬线，数据等宽 |
| 视觉元素 | 战术感分割线、六边形装饰、扫描线效果、数据网格背景 |

---

## 二、技术选型

### 2.1 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| **前端框架** | Next.js 14 (App Router) + TypeScript | SSR 利于博客 SEO，React 生态成熟 |
| **UI 组件** | Tailwind CSS 4 + shadcn/ui | 原子化 CSS + 可定制组件库 |
| **数据库 + 认证** | Supabase (PostgreSQL) | 免费额度充足，自带 Auth + Storage + pgvector |
| **向量检索** | pgvector (Supabase 内置) | 无需额外向量数据库，Postgres 原生集成 |
| **AI API** | DeepSeek API | 用户已有 API Key |
| **Markdown 编辑** | Tiptap + react-markdown | 所见即所得 + 渲染 |
| **PDF 导出** | @react-pdf/renderer | 纯前端生成，无需后端 |
| **日历组件** | react-big-calendar | 成熟稳定，可定制 |
| **图表** | Recharts | React 生态最佳 |
| **部署** | Vercel | Next.js 原生支持，免费额度 |

### 2.2 部署架构

```
用户浏览器
    ↕ HTTPS
Vercel (Next.js SSR/SSG + API Routes)
    ↕
Supabase (PostgreSQL + Auth + Storage + pgvector)
    ↕
DeepSeek API (AI 调用)
```

---

## 三、开源项目复用分析

### 3.1 可复用的开源项目

经过 GitHub 调研，以下项目可作为参考或二次开发基础：

| # | 项目 | Stars | 技术栈 | 可复用部分 | 复用策略 |
|---|------|-------|--------|-----------|---------|
| 1 | **tailwind-nextjs-starter-blog** (timlrx) | 8k+ | Next.js + Tailwind + MDX | 博客模块完整方案：MDX 编辑、代码高亮、SEO、RSS、暗色主题 | **直接集成博客模块**，改造为数据库驱动 |
| 2 | **open-resume** (xitanggg) | 8.8k | Next.js + TypeScript | PDF 导出、简历模板、ATS 友好格式 | **复用 PDF 导出逻辑和简历模板组件** |
| 3 | **Resume-Matcher** (srbhr) | 6k+ | Python + LLM | JD 解析、关键词提取、匹配打分算法 | **参考匹配算法思路**，用 DeepSeek + TS 重写 |
| 4 | **ai-resume-builder** (SamurAIGPT) | — | Next.js + AI | AI 简历优化的 Prompt 设计、SaaS 架构 | **参考 Prompt 和 UX 流程** |
| 5 | **The-Interview-Mentor** (ps06756) | — | AI Agent | 多 Agent 面试模式、题目分类体系 | **参考 Agent 架构和题库分类** |
| 6 | **ai-knowledge-base** (SamurAIGPT) | — | Next.js + RAG | RAG 管道设计、文档分块、向量检索 | **参考 RAG 架构**，用 Supabase pgvector 实现 |

### 3.2 推荐复用方案

**策略：以 tailwind-nextjs-starter-blog 为骨架，叠加其他项目的核心模块**

```
tailwind-nextjs-starter-blog (项目骨架 + 博客)
    +
open-resume (PDF 导出 + 简历模板)
    +
ai-knowledge-base 的 RAG 思路 (用 pgvector 实现)
    +
Resume-Matcher 的匹配算法思路 (用 DeepSeek 重写)
    +
The-Interview-Mentor 的 Agent 架构思路
=
你的个人开发者平台
```

**注意**：不建议直接 fork 单一项目改造，因为：
1. 上述项目各有各的技术栈差异（Python vs TS，不同 UI 框架）
2. 直接 fork 会带入大量不需要的代码
3. 更好的方式是**新建 Next.js 项目，按模块参考复用**

### 3.3 具体复用清单

| 可直接复制 | 需要改造 | 仅参考思路 |
|-----------|---------|-----------|
| 博客 Markdown 渲染管线 | 博客从文件系统改为数据库存储 | RAG 分块策略 |
| 代码高亮配置 | 暗色主题改为明日方舟配色 | JD 匹配打分算法 |
| SEO meta 配置 | 简历模板改为暗色风格 | Agent 工作流编排 |
| RSS feed 生成 | PDF 导出组件集成 | 面试题分类体系 |
| 暗色主题切换逻辑 | — | Token 计量方案 |

---

## 四、功能模块详述（十大模块）

### 模块一：个人主页（Dashboard）

**定位**：平台入口，数据概览 + 快速导航

| 功能点 | 说明 |
|--------|------|
| Hero 区域 | 个人简介 + 技能标签 + 社交链接 |
| 数据概览卡 | 项目总数 / 文章数 / 开发天数 / 本月活跃（4 个数据卡） |
| 开发热力图 | GitHub 风格全年贡献热力图 |
| 最近动态时间线 | 混合展示：新项目、新文章、日历记录（最近 10 条） |
| 快速入口 | 一键跳转：导入项目 / 写博客 / 生成简历 / 面试练习 |

### 模块二：项目库

**定位**：数据中枢，所有模块的数据来源

| 功能点 | 说明 |
|--------|------|
| 智能导入 | 上传 README.md → DeepSeek 解析 → 自动提取：项目名、简介、技术栈、核心功能、时间线、角色、难点/亮点、仓库链接、预览链接 |
| 手动编辑 | 导入后可逐字段修正/补充 |
| 标签体系 | 技术栈标签 + 领域标签，支持自定义 |
| 搜索筛选 | 按名称、标签、时间范围、技术栈多维筛选 |
| 项目状态 | 进行中 / 已完成 / 已归档 |
| 项目详情页 | 完整信息展示，关联博客文章和日历事件 |
| 公开浏览 | 访客可浏览项目列表和详情（无需登录） |
| 向量化 | 项目描述自动 Embedding 存入 pgvector，供 RAG 检索 |

**AI 解析 Prompt 设计**：

```
你是一个项目信息提取专家。请从以下 README 内容中提取结构化项目信息。

README 内容：
{readme_content}

请提取并以 JSON 格式返回：
{
  "name": "项目名称",
  "description": "一句话简介（50字内）",
  "techStack": ["技术1", "技术2", ...],
  "features": ["核心功能1", "核心功能2", ...],
  "highlights": ["技术亮点1", "技术亮点2", ...],
  "role": "角色/职责",
  "startDate": "YYYY-MM（如果可推断）",
  "endDate": "YYYY-MM（如果可推断）",
  "repoUrl": "仓库地址（如果有）",
  "demoUrl": "预览地址（如果有）"
}
只返回 JSON，不要其他文字。
```

### 模块三：智能简历生成器

**定位**：AI 驱动的求职核心工具

#### 3.1 完整流程

```
Step 1: 用户粘贴 JD
    ↓
Step 2: AI 分析 JD → 提取关键技能 / 经验要求 / 加分项
    ↓
Step 3: AI 对项目库全量打分排序 → 展示匹配度
    ↓
Step 4: AI 筛选 Top N 项目 → 针对岗位重写描述
    ↓
Step 5: AI 自评 → 对生成内容打分 + 优化建议
    ↓
Step 6: 用户预览 → 手动微调
    ↓
Step 7: 导出 PDF
```

#### 3.2 功能清单

| 功能点 | 说明 |
|--------|------|
| JD 输入 | 粘贴岗位描述，AI 自动识别关键技能、经验要求、加分项 |
| 智能匹配 | 项目库全量打分，展示每个项目的匹配度百分比 |
| 描述润色 | 针对岗位关键词重写项目描述，量化成果 |
| AI 自评 | AI 对生成的简历描述打分（1-10），给出优化建议 |
| 人工反馈 | 用户修改 AI 生成的内容，系统记录差异（用于 Prompt 迭代） |
| 简历预览 | 可视化预览，支持手动调整项目顺序、修改描述 |
| 多版本管理 | 每次生成保存一个版本，可对比不同岗位的简历 |
| PDF 导出 | 一键导出 ATS 友好的 PDF |

#### 3.3 JD 分析 Prompt

```
你是一个资深技术招聘专家。请分析以下岗位描述。

岗位描述：
{jd_content}

请以 JSON 格式返回：
{
  "title": "岗位名称",
  "requiredSkills": [{"skill": "技能名", "importance": "high/medium/low"}],
  "requiredExperience": "经验要求（如3-5年）",
  "responsibilities": ["职责1", "职责2", ...],
  "preferredSkills": ["加分项1", "加分项2", ...],
  "keywords": ["关键词1", "关键词2", ...]
}
只返回 JSON。
```

#### 3.4 项目匹配 Prompt

```
你是一个技术简历顾问。请根据岗位要求，对以下项目列表进行匹配度评分。

岗位要求：
{jd_analysis_json}

项目列表：
{projects_json}

请对每个项目评分（0-100），并说明评分理由。以 JSON 数组返回：
[
  {
    "projectId": "项目ID",
    "score": 85,
    "reason": "该项目使用了岗位要求的 React 和 Node.js...",
    "relevantSkills": ["React", "Node.js"],
    "suggestedDescription": "针对该岗位优化的项目描述（80-120字，突出相关技能和量化成果）"
  }
]
按 score 从高到低排序。只返回 JSON。
```

#### 3.5 AI 自评 Prompt

```
你是一个简历审查专家。请评估以下生成的简历项目描述的质量。

岗位要求：{jd_summary}
项目描述：
{generated_descriptions}

请对每条描述评估（1-10分）：
[
  {
    "description": "描述内容",
    "clarityScore": 8,
    "relevanceScore": 9,
    "quantificationScore": 6,
    "overallScore": 7.5,
    "suggestions": ["建议1：增加具体的性能数据", "建议2：..."]
  }
]
只返回 JSON。
```

### 模块四：开发日历

**定位**：开发轨迹可视化

| 功能点 | 说明 |
|--------|------|
| 月/周/日视图 | 三种视图切换 |
| 事件自动映射 | 项目时间线自动标注——开始、提交、上线 |
| 博客联动 | 发布博客的日期自动标记 |
| 手动记录 | "今天做了什么"快速记录，可关联项目 |
| 热力图 | GitHub 风格全年贡献热力图 |
| 月度统计 | 活跃天数、项目进度、发文数量 |

### 模块五：博客 / 生活记录

**定位**：对外展示的写作平台

| 功能点 | 说明 |
|--------|------|
| Markdown 编辑器 | Tiptap 所见即所得 + 代码高亮 |
| 分类 | 想法（Ideas）/ 生活（Life）/ 技术笔记（Tech Notes） |
| 标签系统 | 跨分类标签 |
| 关联项目 | 文章可关联项目库中的项目 |
| 公开浏览 | 访客可浏览（无需登录） |
| SEO | SSG 静态生成，meta / sitemap / robots |
| RSS | 自动生成 RSS feed |
| 向量化 | 文章内容自动 Embedding，供 RAG 检索 |

### 模块六：设置

| 功能点 | 说明 |
|--------|------|
| 个人信息 | 名称、简介、头像、社交链接 |
| API Key 管理 | DeepSeek API Key 加密存储 |
| 博客设置 | 默认分类、默认标签 |
| 数据导出 | 导出所有数据为 JSON |

### 模块七：AI 知识助手（RAG）

**定位**：基于项目库和博客的智能问答 + 语义搜索

#### 7.1 架构

```
项目描述 + 博客文章
       ↓
文本分块（Chunking）
       ↓
DeepSeek Embedding API 向量化
       ↓
存入 Supabase pgvector
       ↓
用户提问 → 向量化 → 语义检索 Top-K
       ↓
DeepSeek 基于检索结果生成回答（SSE 流式输出）
```

#### 7.2 功能清单

| 功能点 | 说明 |
|--------|------|
| 站内语义搜索 | 自然语言搜索项目和博客（非关键词匹配） |
| AI 对话助手 | 访客问"你做过哪些 React 项目？"→ AI 检索回答 |
| 流式回答 | SSE 实现打字机效果 |
| 上下文记忆 | 多轮对话保持上下文，支持追问 |
| 引用标注 | 回答中标注信息来源（哪个项目/哪篇文章） |
| 自动索引 | 新增/修改项目或博客时自动重新 Embedding |

#### 7.3 数据模型

```sql
-- 向量存储表
CREATE TABLE embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('project', 'blog')),
  source_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 向量索引
CREATE INDEX embeddings_vector_idx ON embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 对话历史表
CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 模块八：Token 监控中心

**定位**：AI 调用的可观测性与成本控制

| 功能点 | 说明 |
|--------|------|
| Token 用量记录 | 每次 AI 调用记录：类型、输入 Token、输出 Token、耗时、成本 |
| 成本统计面板 | 按日/周/月统计 Token 消耗和费用 |
| 调用日志 | 最近的 AI 调用记录（Prompt 摘要 + 响应摘要） |
| 限流控制 | 单日 Token 上限，超限拒绝调用并提示 |
| 按功能统计 | 各模块的 Token 消耗占比 |

```sql
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL CHECK (module IN ('resume', 'knowledge', 'project_import', 'interview', 'project_generator')),
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost_usd DECIMAL(10, 4),
  duration_ms INT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_usage_logs_created_at_idx ON ai_usage_logs (created_at);
CREATE INDEX ai_usage_logs_module_idx ON ai_usage_logs (module);
```

### 模块九：AI 项目生成器

**定位**：技能缺口分析 + 项目推荐方案生成

#### 9.1 触发流程

```
简历生成器中 JD 分析完成
    ↓
AI 对比 JD 要求 vs 项目库覆盖
    ↓
识别技能缺口（完全缺失 / 覆盖不足）
    ↓
AI 生成项目推荐方案（每个缺口 1-2 个项目）
    ↓
用户选择感兴趣的项目 → 保存为"计划中"状态
    ↓
用户实际开发完成 → 导入项目库 → 重新匹配 JD → 匹配度提升
```

#### 9.2 功能清单

| 功能点 | 说明 |
|--------|------|
| 技能缺口识别 | 对比 JD 要求技能与项目库已有技能，标注缺口 |
| 项目方案生成 | AI 生成完整项目方案（名称/简介/技术栈/功能/周期/学习资源） |
| 简历价值预测 | 完成后该项目在简历中的描述方式 |
| 计划项目管理 | 推荐项目保存为"计划中"，开发完成后转为正式项目 |
| 学习路径 | AI 生成学习该技能的推荐路径和资源 |

#### 9.3 项目方案生成 Prompt

```
你是一个技术项目顾问。用户需要补齐以下技能缺口，请推荐一个练习项目。

技能缺口：{skill_gaps}
用户现有技能：{existing_skills}
目标岗位：{target_role}

请生成一个项目方案，以 JSON 返回：
{
  "name": "项目名称",
  "description": "50字内简介",
  "whyRecommended": "为什么推荐这个项目（对应哪些JD要求）",
  "techStack": ["技术1", "技术2", ...],
  "features": ["核心功能1", "核心功能2", ...],
  "implementation": "实现思路与技术要点（100字内）",
  "estimatedDays": 14,
  "learningResources": [
    {"title": "资源名", "url": "链接", "type": "doc/video/course"}
  ],
  "resumeValue": "完成后在简历中的描述方式（80字内）"
}
只返回 JSON。
```

### 模块十：AI 面试教练

**定位**：基于目标岗位的面试准备 + 模拟面试

#### 10.1 两种模式

**模式 A：面试题库生成**

```
目标岗位 JD + 用户项目库
       ↓
   AI 分析岗位要求
       ↓
   生成分类面试题
   ├── 技术基础题（对应 JD 技术栈）
   ├── 项目深挖题（基于用户实际项目）
   ├── 系统设计题
   └── 行为面试题
       ↓
   每道题包含：
   ├── 题目 + 考察点 + 难度等级
   ├── AI 参考答案（结合用户项目经历）
   ├── 可能的追问
   └── 评分标准
```

**模式 B：模拟面试（交互式）**

```
AI 扮演面试官
  ↓
开场提问（基于简历项目）
  ↓
用户输入回答
  ↓
AI 实时分析：
  ├── 回答完整性（STAR 法则）
  ├── 技术深度（细节支撑）
  ├── 逻辑结构（条理性）
  └── 改进建议
  ↓
AI 追问 / 进入下一题
  ↓
面试结束 → 生成评估报告
  ├── 各维度评分（1-10）
  ├── 优势总结
  ├── 薄弱环节
  └── 改进建议
```

#### 10.2 功能清单

| 功能点 | 说明 |
|--------|------|
| 面试题生成 | 基于 JD + 项目库生成分类面试题 |
| 参考答案 | AI 生成结合用户经历的参考答案 |
| 追问预测 | 每道题列出可能的追问方向 |
| 模拟面试 | 多轮交互式对话，AI 扮演面试官 |
| 实时反馈 | 对用户回答给出评分和改进建议 |
| 评估报告 | 面试结束后生成综合评估 |
| 题目收藏 | 标记重要题目，反复练习 |
| 练习记录 | 记录每次练习的回答和反馈 |

#### 10.3 面试题生成 Prompt

```
你是一个资深技术面试官。请基于以下信息生成面试题。

目标岗位要求：
{jd_analysis_json}

候选人项目经历：
{projects_summary_json}

请生成 15 道面试题，覆盖以下类别，以 JSON 数组返回：
[
  {
    "id": 1,
    "category": "technical",  // technical | project | system_design | behavioral
    "question": "题目内容",
    "difficulty": 2,  // 1-3
    "assessmentPoints": ["考察点1", "考察点2"],
    "referenceAnswer": "参考答案（结合候选人项目经历）",
    "followUps": ["可能的追问1", "可能的追问2"],
    "linkedProjectId": "关联项目ID（如果有）"
  }
]
技术题5道、项目题4道、系统设计3道、行为题3道。只返回 JSON。
```

#### 10.4 模拟面试 Prompt（System Prompt）

```
你是一个资深技术面试官，正在面试候选人应聘以下岗位。

岗位要求：{jd_summary}
候选人项目经历：{projects_summary}

面试规则：
1. 每次只问一个问题，等候选人回答后再追问或进入下一题
2. 先从项目经历切入，再逐步深入技术细节
3. 根据候选人回答质量决定是否追问
4. 追问时聚焦：技术深度、决策理由、遇到的挑战
5. 如果候选人回答不完整，引导补充
6. 面试共 8-10 轮对话
7. 候选人回答后，先给出简短反馈（1-2句），再追问或换题

请以面试官身份开始面试。第一句话要自然、友好。
```

#### 10.5 评估报告 Prompt

```
你是面试评估专家。请根据以下模拟面试记录生成评估报告。

面试记录：
{conversation_log}

请以 JSON 返回：
{
  "technicalDepth": 7,        // 1-10
  "projectClarity": 8,        // 1-10
  "communicationSkill": 6,    // 1-10
  "problemSolving": 7,        // 1-10
  "overallScore": 7,          // 加权总分
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["薄弱点1", "薄弱点2"],
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]
}
只返回 JSON。
```

---

## 五、数据库设计（完整）

### 5.1 表结构

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ========== 项目相关 ==========
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}',
  role TEXT,
  repo_url TEXT,
  demo_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  readme_content TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 博客相关 ==========
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT CHECK (category IN ('ideas', 'life', 'tech_notes')),
  tags TEXT[] DEFAULT '{}',
  cover_image TEXT,
  linked_project_id UUID REFERENCES projects(id),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  reading_time INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 日历相关 ==========
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  event_type TEXT CHECK (event_type IN ('project_start', 'project_end', 'commit', 'release', 'blog_post', 'manual')),
  title TEXT NOT NULL,
  description TEXT,
  linked_project_id UUID REFERENCES projects(id),
  linked_blog_id UUID REFERENCES blog_posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 简历相关 ==========
CREATE TABLE resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_role TEXT,
  jd_content TEXT,
  jd_analysis JSONB,
  selected_project_ids UUID[] DEFAULT '{}',
  generated_content JSONB,
  ai_evaluation JSONB,
  user_modifications JSONB,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 面试相关 ==========
CREATE TABLE interview_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id UUID REFERENCES resumes(id),
  category TEXT CHECK (category IN ('technical', 'project', 'system_design', 'behavioral')),
  question TEXT NOT NULL,
  difficulty INT CHECK (difficulty BETWEEN 1 AND 3),
  assessment_points TEXT[] DEFAULT '{}',
  reference_answer TEXT,
  follow_ups TEXT[] DEFAULT '{}',
  linked_project_id UUID REFERENCES projects(id),
  user_answer TEXT,
  ai_feedback JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'practiced', 'mastered')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mock_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id UUID REFERENCES resumes(id),
  conversation JSONB DEFAULT '[]',
  evaluation JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ========== AI 项目推荐 ==========
CREATE TABLE recommended_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id UUID REFERENCES resumes(id),
  skill_gap TEXT NOT NULL,
  project_plan JSONB,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'started', 'completed')),
  converted_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== RAG 向量 ==========
CREATE TABLE embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('project', 'blog')),
  source_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== AI 调用日志 ==========
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL CHECK (module IN ('resume', 'knowledge', 'project_import', 'interview', 'project_generator', 'blog_assistant')),
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost_usd DECIMAL(10, 4),
  duration_ms INT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 索引 ==========
CREATE INDEX projects_tags_idx ON projects USING GIN (tags);
CREATE INDEX projects_tech_stack_idx ON projects USING GIN (tech_stack);
CREATE INDEX projects_status_idx ON projects (status);
CREATE INDEX blog_posts_slug_idx ON blog_posts (slug);
CREATE INDEX blog_posts_category_idx ON blog_posts (category);
CREATE INDEX blog_posts_published_idx ON blog_posts (published_at);
CREATE INDEX calendar_events_date_idx ON calendar_events (date);
CREATE INDEX calendar_events_project_idx ON calendar_events (linked_project_id);
CREATE INDEX embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX embeddings_source_idx ON embeddings (source_type, source_id);
CREATE INDEX ai_usage_logs_created_at_idx ON ai_usage_logs (created_at);
CREATE INDEX ai_usage_logs_module_idx ON ai_usage_logs (module);
CREATE INDEX chat_sessions_session_idx ON chat_sessions (session_id);
```

---

## 六、页面路由设计

| 路由 | 页面 | 权限 | 说明 |
|------|------|------|------|
| `/` | 个人主页 | 公开 | Dashboard + 数据概览 |
| `/projects` | 项目列表 | 公开 | 支持搜索筛选 |
| `/projects/[id]` | 项目详情 | 公开 | 完整信息 + 关联文章 |
| `/projects/import` | 导入项目 | 管理员 | 上传 README + AI 解析 |
| `/projects/recommended` | 推荐项目 | 管理员 | AI 生成的项目方案 |
| `/resume` | 简历生成器 | 管理员 | JD 输入 → 匹配 → 预览 |
| `/resume/history` | 简历版本 | 管理员 | 历史版本管理 |
| `/interview` | 面试教练 | 管理员 | 题库 + 模拟面试 |
| `/interview/practice/[id]` | 题目练习 | 管理员 | 单题练习 |
| `/interview/mock/[id]` | 模拟面试 | 管理员 | 交互式面试 |
| `/calendar` | 开发日历 | 管理员 | 月/周/日视图 |
| `/blog` | 博客列表 | 公开 | 文章列表 |
| `/blog/[slug]` | 博客文章 | 公开 | 文章详情 |
| `/blog/new` | 写博客 | 管理员 | Markdown 编辑器 |
| `/blog/edit/[id]` | 编辑博客 | 管理员 | 编辑文章 |
| `/chat` | AI 知识助手 | 公开 | 对话界面 |
| `/settings` | 设置 | 管理员 | 个人信息 + API Key |
| `/settings/usage` | Token 监控 | 管理员 | 用量统计 |
| `/login` | 登录 | 公开 | Supabase Auth |

---

## 七、开发计划

### 7.1 开发原则

- **先骨架后血肉**：先搭好基础框架和数据库，再逐模块填充
- **先核心后增强**：先做项目库和简历生成（核心闭环），再做 AI 面试等增强模块
- **先可用后完美**：每个模块先做 MVP，再迭代优化
- **每阶段可交付**：每个 Phase 结束都是一个可独立使用的版本

### 7.2 开发阶段

#### Phase 0：项目初始化（1 天）

| 任务 | 说明 |
|------|------|
| 创建 Next.js 项目 | `npx create-next-app@latest` + TypeScript + Tailwind |
| 配置 Supabase | 创建项目、数据库、Auth 配置 |
| 安装核心依赖 | shadcn/ui、prisma、next-mdx-remote 等 |
| 暗色主题配置 | 全局 CSS 变量、明日方舟配色体系 |
| 基础布局 | 左侧导航 + 顶部 Header + 主内容区 |
| Git 初始化 | 首次提交 |

#### Phase 1：项目库 + 认证（3 天）⭐ 最高优先级

| 任务 | 说明 |
|------|------|
| Supabase Auth 集成 | GitHub OAuth 登录 + 中间件鉴权 |
| 数据库表创建 | 执行全部 SQL（项目表 + 博客表 + 日历表等） |
| 项目 CRUD API | 增删改查 API Routes |
| 项目列表页 | 卡片布局 + 搜索筛选 + 标签过滤 |
| 项目详情页 | 完整信息展示 |
| 项目导入页 | 上传 README → 调用 DeepSeek 解析 → 预填表单 |
| 项目编辑页 | 手动编辑/修正 |

**交付物**：可登录、可导入项目、可浏览项目库

#### Phase 2：智能简历生成器（4 天）⭐ 最高优先级

| 任务 | 说明 |
|------|------|
| JD 输入页面 | 粘贴 JD + 提交分析 |
| JD 分析 API | 调用 DeepSeek + Prompt + 结果存储 |
| 项目匹配 API | 对比 JD 与项目库 + 打分排序 |
| 简历预览页面 | 展示匹配结果 + AI 生成描述 |
| AI 自评 API | 对生成内容打分 + 建议 |
| 手动微调 | 编辑器修改 AI 生成内容 |
| PDF 导出 | 集成 @react-pdf/renderer |
| 多版本管理 | 保存历史版本 + 对比 |

**交付物**：完整的 JD → 简历 → PDF 闭环

#### Phase 3：博客系统（2 天）

| 任务 | 说明 |
|------|------|
| 博客 CRUD API | 增删改查 |
| Markdown 编辑器 | Tiptap 集成 + 代码高亮 |
| 博客列表页 | 分类 + 标签筛选 |
| 博客详情页 | MDX 渲染 + SEO meta |
| SSG + ISR | 静态生成已发布文章 |
| RSS Feed | 自动生成 |

**交付物**：可写博客、公开可读

#### Phase 4：开发日历（2 天）

| 任务 | 说明 |
|------|------|
| 日历视图 | react-big-calendar 集成 + 暗色定制 |
| 事件自动映射 | 项目/博客事件自动标注 |
| 手动记录 | 快速添加记录 |
| 热力图 | 全年贡献热力图 |
| 月度统计 | 数据卡片 |

**交付物**：日历可视化 + 热力图

#### Phase 5：AI 知识助手 RAG（3 天）⭐ 简历加分

| 任务 | 说明 |
|------|------|
| Embedding 生成 | 项目/博客内容分块 + 调用 Embedding API |
| 向量存储 | pgvector 存储 + 索引 |
| 语义搜索 API | 向量检索 + 召回 |
| 对话界面 | 聊天 UI + 消息列表 |
| SSE 流式响应 | DeepSeek streaming + 打字机效果 |
| 引用标注 | 回答中标注来源 |
| 自动索引 | 数据变更时重新 Embedding |

**交付物**：站内 AI 问答 + 语义搜索

#### Phase 6：Token 监控中心（1 天）

| 任务 | 说明 |
|------|------|
| 用量记录中间件 | 包装所有 AI 调用，自动记录 Token |
| 统计面板 | 按日/周/月统计图表 |
| 调用日志 | 最近调用记录列表 |
| 限流控制 | 单日上限配置 |

**交付物**：Token 用量可观测

#### Phase 7：AI 项目生成器（2 天）⭐ 简历加分

| 任务 | 说明 |
|------|------|
| 技能缺口分析 API | JD 要求 vs 项目库覆盖 |
| 项目方案生成 API | DeepSeek 生成推荐项目 |
| 推荐项目页面 | 展示方案 + 保存/忽略 |
| 计划项目管理 | 状态流转（计划→进行→完成） |
| 学习路径生成 | AI 生成学习资源 |

**交付物**：缺口分析 + 项目推荐闭环

#### Phase 8：AI 面试教练（3 天）⭐ 简历加分

| 任务 | 说明 |
|------|------|
| 面试题生成 API | 基于 JD + 项目库生成题库 |
| 题库浏览页面 | 分类展示 + 难度筛选 |
| 单题练习 | 用户回答 + AI 反馈 |
| 模拟面试 API | 多轮对话 + 上下文管理 |
| 模拟面试页面 | 聊天式交互界面 |
| 评估报告 | 面试结束后生成报告 |
| 题目收藏 | 标记 + 反复练习 |

**交付物**：面试题库 + 模拟面试闭环

#### Phase 9：个人主页 Dashboard（1 天）

| 任务 | 说明 |
|------|------|
| Hero 区域 | 个人简介 + 技能标签 |
| 数据概览卡 | 4 个核心数据 |
| 热力图集成 | 嵌入日历模块 |
| 最近动态 | 时间线聚合展示 |
| 快速入口 | 导航卡片 |

**交付物**：完整的首页

#### Phase 10：部署与优化（1-2 天）

| 任务 | 说明 |
|------|------|
| Vercel 部署 | 环境变量配置 + 构建 |
| Supabase 生产配置 | RLS 策略 + 备份 |
| SEO 优化 | sitemap / robots / meta |
| 性能优化 | 图片懒加载 / ISR / 缓存 |
| 移动端适配 | 响应式检查 |
| 域名绑定 | （可选）自定义域名 |

**交付物**：线上可访问的完整平台

### 7.3 开发计划时间线

```
Week 1 (Day 1-7):
  Day 1   - Phase 0: 项目初始化
  Day 2-4 - Phase 1: 项目库 + 认证 ⭐
  Day 5-8 - Phase 2: 智能简历生成器 ⭐

Week 2 (Day 8-14):
  Day 8-9  - Phase 2 续: 简历 PDF + 多版本
  Day 10-11 - Phase 3: 博客系统
  Day 12-13 - Phase 4: 开发日历
  Day 14   - Phase 5: RAG 知识助手（开始）

Week 3 (Day 15-21):
  Day 15-17 - Phase 5: RAG 知识助手 ⭐
  Day 18   - Phase 6: Token 监控
  Day 19-20 - Phase 7: AI 项目生成器 ⭐
  Day 21   - Phase 8: AI 面试教练（开始）

Week 4 (Day 22-26):
  Day 22-24 - Phase 8: AI 面试教练 ⭐
  Day 25   - Phase 9: 首页 Dashboard
  Day 26   - Phase 10: 部署上线

总计：约 24-26 天（4 周）
```

### 7.4 优先级矩阵

| 优先级 | 模块 | 理由 |
|--------|------|------|
| **P0 必做** | Phase 0-1: 项目库 + 认证 | 整个平台的数据基础 |
| **P0 必做** | Phase 2: 智能简历生成器 | 核心功能闭环 |
| **P1 重要** | Phase 3: 博客系统 | 写入简历的展示价值 |
| **P1 重要** | Phase 4: 开发日历 | 差异化亮点 |
| **P1 重要** | Phase 9: 首页 Dashboard | 第一印象 |
| **P2 简历加分** | Phase 5: RAG 知识助手 | AI 应用工程师核心能力 |
| **P2 简历加分** | Phase 7: AI 项目生成器 | 差异化 + Agent 能力 |
| **P2 简历加分** | Phase 8: AI 面试教练 | 多轮对话 + AI 评估 |
| **P3 锦上添花** | Phase 6: Token 监控 | 成本管理意识 |
| **P3 锦上添花** | Phase 10: 部署优化 | 收尾工作 |

### 7.5 MVP 与完整版

如果时间紧张，可以分两轮交付：

**MVP（2 周）**：Phase 0 + 1 + 2 + 3 + 9 + 10
→ 可用的项目库 + 简历生成 + 博客 + 首页

**完整版（4 周）**：MVP + Phase 4 + 5 + 6 + 7 + 8
→ 全部十个模块

---

## 八、简历描述（最终版）

> **个人开发者平台（AI 驱动求职闭环）**  
> 技术栈：Next.js 14 / TypeScript / Supabase / DeepSeek API / pgvector / Vercel  
>   
> - **RAG 知识助手**：基于 Embedding + pgvector 向量化项目库与博客，实现语义检索与智能问答，用 SSE 实现流式响应，支持多轮对话与引用标注  
> - **智能简历生成**：设计多步 AI Agent 工作流（JD 分析→项目匹配→描述润色→AI 自评→PDF 导出），引入人工反馈闭环驱动 Prompt 迭代优化  
> - **技能缺口分析**：AI 自动识别 JD 要求与项目库的技能差距，生成针对性项目方案（含技术栈、功能清单、学习路径），完成后回流项目库提升匹配度  
> - **AI 面试教练**：基于目标岗位生成分类面试题与参考答案，支持多轮模拟面试，AI 实时评分并给出 STAR 法则改进建议  
> - **Token 成本管理**：设计用量追踪与限流机制，按模块统计 AI 调用成本  
> - **全栈工程**：Supabase 处理 Auth + PostgreSQL + Storage + pgvector，Vercel 部署，SSG/ISR 优化博客 SEO

---

## 九、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DeepSeek API 解析 README 不准确 | 项目信息有误 | 解析结果必须用户确认后才入库 |
| DeepSeek Embedding API 维度与 pgvector 不匹配 | 向量检索失败 | 确认 Embedding 模型维度后建表 |
| Vercel 免费额度限制 | API 调用受限 | 合理使用 ISR 缓存，减少 SSR |
| Supabase 免费额度 | 存储/带宽受限 | 图片压缩后上传，定期清理无用文件 |
| PDF 生成在 Serverless 超时 | 导出失败 | 限制简历内容长度，或前端生成 |
| DeepSeek API 速率限制 | 高频调用被拒 | 实现请求队列 + 重试机制 |
| 开源项目复用的 License 合规 | 法律风险 | 检查 MIT/Apache License，保留版权声明 |

---

## 十、验收标准

- [ ] 访客可浏览博客、项目列表和详情、个人主页
- [ ] 管理员可登录，进行所有管理操作
- [ ] 上传 README.md 后，AI 能解析并预填项目信息
- [ ] 粘贴 JD 后，AI 能分析并匹配项目库中的项目
- [ ] 可编辑 AI 生成的简历内容并导出 PDF
- [ ] 技能缺口分析能识别缺失技能并推荐项目方案
- [ ] 面试题库能基于 JD 和项目生成分类题目
- [ ] 模拟面试支持多轮对话并生成评估报告
- [ ] AI 知识助手可基于项目库和博客回答访客问题（流式）
- [ ] Token 用量可追踪和统计
- [ ] 日历正确显示项目和博客事件
- [ ] 热力图正确反映全年开发活跃度
- [ ] 博客支持 Markdown 编辑和代码高亮
- [ ] 全站暗色明日方舟风格一致
- [ ] 移动端基本可用（优先桌面端）
- [ ] 部署到 Vercel 可公开访问
