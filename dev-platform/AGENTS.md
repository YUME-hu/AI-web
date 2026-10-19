# AGENTS.md — 个人开发者平台 · 表现层硬约束

> 本文件约束**所有**后续 UI 修改。任何与代码现状冲突之处，以本文件为准。
> 需要突破其中任何一条，必须先说明理由并取得确认，不得自行放宽。

---

## 0. 已核实的环境事实（动手前先读，勿凭印象写代码）

| 项 | 实际值 | 备注 |
|---|---|---|
| 框架 | **Next.js 16.2.11**（App Router） | 不是 Next 14。按 16 的约定书写 |
| React | 19.2.4 | |
| 样式 | **Tailwind CSS 4**（CSS-first） | |
| 设计令牌位置 | `src/app/globals.css` 的 `@theme inline` + `:root` | **仓库内不存在 `tailwind.config.ts`**。Tailwind 4 默认不读取它；若新建该文件而不加 `@config` 指令，它只是一份**永不生效的死配置**。因此本项目的令牌一律写在 CSS 里 |
| UI 原语 | shadcn/ui，底层是 **`@base-ui/react`** | 不是 `@radix-ui/react-*`，不要按 radix 的 API 改 |
| 源码根 | **`src/`** | 路由是 `src/app/**`，不是 `app/**`；别名 `@/` 指向 `src/` |
| 包管理 | npm（`package-lock.json`） | |
| 开发服务 | `npm run dev` → http://localhost:3000 | 首屏需编译，单次请求可能耗时 10s+，属正常 |

---

## 1. 技术栈约束

1. 只允许使用**现有的** Tailwind CSS 4 + shadcn/ui（`@base-ui/react`）+ `lucide-react` 图标。
2. **禁止引入任何新的第三方 UI 库**（含 Radix、MUI、Chakra、Ant Design、Headless UI、framer-motion 等）。
3. 禁止为了做 UI 而新增运行时依赖。确需新增，必须先说明理由并取得确认。
4. 所有图形（复古彩条、警告斜纹、任务徽章、铆钉、终端光标）**一律用 CSS 或内联 SVG 实现**，禁止引入外部图片、图标字体或图床资源。

---

## 2. 视觉规范约束（NASA-Punk / 工业控制台）

### 2.1 色板（唯一权威来源：`src/app/globals.css`）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--background` | `#ECE5D6` | 全站主背景（米白/浅灰，工业外壳/档案纸） |
| `--foreground` | `#191919` | 主文字与边框（炭黑） |
| `--card` | `#FFFFFF` | 面板底色（纯白） |
| `--card-foreground` | `#191919` | 面板文字 |
| `--primary` | `#D63A2C` | **全站唯一鲜艳色**：警示红 |
| `--muted` | `#E2DCD0` | 次级背景（稍暗的米色） |
| `--border` | `#191919` | 全站边框统一色 |

- **警示红 `#D63A2C` 的允许清单（白名单，之外一律算错）**：
  1. 主按钮（Primary Button）的填充色；
  2. 输入框左侧的方块光标 `█`、终端提示符 `>_`；
  3. 侧栏激活项的 4px 竖条；
  4. `Badge variant="destructive"` 等警告标签；
  5. 错误/失败状态文案。
  **禁止**用于：页面标题、眉标 `// XXX`、装饰图标与箭头、统计数字、图表配色、hover 高亮、
  选中态 tab、热力图色阶。这些一律走炭黑 `#191919`、次级灰或《星空》辅助色板。

- **《星空》辅助色板（仅用于数据可视化 / 状态 / 次级高亮，不与警示红争抢）**：

| 令牌 | 值 | 用途 |
|---|---|---|
| `--chart-blue` | `#21467A` | 剧场蓝/信标蓝：图表主色、热力图高活跃度、状态高亮 |
| `--chart-orange` | `#D45814` | 波斯橙：第二级高亮、分类色 |
| `--chart-sand` | `#DBA972` | 金秋岁月：热力图低活跃度、底纹 |
| `--chart-olive` | `#7A7F4E` | NASA 四色条里的橄榄，兼作模块分类色 |
| `--chart-slate` | `#4C5A68` | NASA 四色条里的石板蓝灰，兼作模块分类色 |

- 禁止出现第二种"鲜艳色"。旧青色 `#00D4FF`、琥珀橙 `#FF8C00`、旧灰 `#8B949E`
  已在本次重构中废弃，不得在任何地方写死（含图表的 `stroke` / `fill` / tooltip 内联样式）。

### 2.2 硬性禁令

1. **禁止 `backdrop-filter` / `backdrop-blur`**（卡顿）。
2. **禁止发光效果**：禁止 `text-shadow` 光晕、霓虹色、彩色 `box-shadow`。
3. **禁止大面积 `box-shadow`**。面板层次一律靠 1px 边框表达，不靠投影。
4. **禁止 `will-change`**（除非有实测性能收益并注明）。
5. **禁止过渡性渐变**（见 §2.5 唯一例外）。
6. **禁止 `border-radius` 大于 2px**。
7. **禁止过渡动画用于发光**。hover 只允许"颜色直接反转"这种**无过渡**或极短（≤80ms）的状态切换。

### 2.3 形状

- 所有圆角**强制 0**（`--radius: 0px`，`--radius-*` 全部派生为 0）。极少数确有必要时上限 2px。
- 所有边框统一 `1px solid #191919`，模拟机械接缝。
- 卡片（`Card`）必须同时具备：
  - **左上 + 右下各一枚 `4px × 4px` 纯黑方块**（`.rivet` 伪元素）模拟铆钉；
  - **顶部 `6px` 黑白 45° 斜纹条**（`.card-hazard`，`repeating-linear-gradient`）作为危险/重要标识。
  左上铆钉下移到 `top: 12px`，避免被斜纹条压住。
- **禁止新增手写卡片**：新写的面板一律用 `<Card>`。
  历史遗留的 `<div>` 面板已在 Phase 10 统一挂上 `.card-hazard .rivet`（视觉上与 Card 等价），
  后续改动若碰到它们，应顺手迁移成 `<Card>`，但不要为了迁移而重排布局。
- 旧的斜切角工具类 `clip-corner` 已改为**方角无操作**，保留类名以免改动 40+ 处调用点。

### 2.3.1 输入框

- `.np-input`（`Input` / `Textarea` 共用）：纯白底 `#FFFFFF`、`1px solid #191919`、圆角 0、
  左侧一枚红色实心方块光标 `█`（`background-image` 色块，`6px × 14px`，`padding-left: 26px`）。
- 聚焦时用 `outline: 1px solid #191919; outline-offset: -1px` 叠加成 **视觉 2px 黑边**，
  **不得**直接把 `border-width` 改成 2px（会造成 1px 布局抖动）。
- 禁止灰色底输入框（`bg-input/30`、`bg-muted` 一律不允许作为输入框底色）。

### 2.4 字体

- 标题 / 数据 / 编号：等宽或宽体无衬线，**全大写 + 加大字距（`tracking-widest`）**。优先 `Space Mono`，回落 `ui-monospace / Consolas`。
- 中文正文：思源黑体（`Source Han Sans SC / Noto Sans SC`），回落 `Microsoft YaHei`。
- 数字（统计值、时间戳、编号）**必须**用等宽字体，避免跳动。

### 2.5 唯一例外：NASA 四色条

规范要求"禁止渐变"，此处指**装饰性/过渡性渐变与发光渐变**。
NASA 经典四色条是**硬边色块拼接**（`linear-gradient` 硬停止，无色阶过渡），属规格强制元素，是唯一例外：

```
linear-gradient(to right, #4C5A68 25%, #7A7F4E 25% 50%, #D2A85E 50% 75%, #A8432F 75%)
```

实现统一放在 `globals.css` 的 `.nasa-bar`，高度 4px，禁止在页面里重复手写。
除它之外，任何 `linear-gradient` / `radial-gradient` 仅允许用于**几何纹理**（`repeating-linear-gradient` 斜纹、网格线）。

### 2.6 第二例外：状态指示灯 LED

`border-radius` ≤ 2px 的规则，对**状态指示灯**放行：允许一个最大 6px 的圆形 LED
（`rounded-full` + `--success`），因为它模拟的是真实设备上的指示灯珠，方角反而失真。
全站仅允许出现在状态位（如 Header 的 `READY`、侧栏底部 `SYS.ONLINE`），
**不得**扩散到头像、图标底色、标签等装饰性元素。禁止给它加 `animate-ping` 等脉冲动画。

### 2.7 硬件通讯终端（`/chat`、`/interview/mock`）

两个会话面板**必须共用同一套结构与类名**，改一个就要同步另一个。

1. 容器：`.term-panel`（`#191919` 底 / `#ECE5D6` 字），消息滚动区再压一层 `#101010`。
2. **禁止气泡**。用户与 AI 的消息不再用圆角气泡包裹，一律靠 `.term-rule`
   （`1px rgb(236 229 214 / 0.2)`）上下分割，全宽铺满。
3. 每条 AI 回答首行**强制** `[SYS_LOG // HH:MM:SS]`；用户输入首行 `[INPUT // HH:MM:SS]`，
   正文前带红色 `>_` 提示符（属红色白名单）。
4. 时间戳必须包 `suppressHydrationWarning`：服务端时区与浏览器时区不同，
   否则 `mock-session` 用服务端传来的 `conversation` 首渲会水合不一致。
5. **禁止任何转圈动画**（`Loader2` + `animate-spin` 一律不得进入终端）。
   加载态用 `.term-blink` + 文本 `[ LOADING... ]`；流式尾部用闪烁红色方块光标。
6. 输入框用 `.np-input .np-input-term`：深底米白字、红色方块光标 `█`、
   `padding-left: 26px`、聚焦米白 2px 视觉边框。
7. 终端内按钮：主操作用 Primary（红底白字），次操作用"米白描边 + hover 反白"，
   不得使用浅色底的默认次级按钮（会在深底上看不见）。

### 2.8 简历 PDF（`resume-pdf.tsx`）

PDF 是**打印物**，版式规则独立于站内，但视觉语言必须一致。

1. **字体分派（硬规则）**：
   - 纯 ASCII 标签（`PERSONNEL FILE`、`FILE_NO`、`[01] PROJECTS`、`TECH_STACK`、页脚）→ `Courier`；
   - 任何可能含中文的内容（姓名、岗位、正文、中文标题）→ `NotoSansSC`。
   - **禁止把中文放进 Courier**：react-pdf 不做逐字形回退，中文会直接丢字变空白。
   - 禁止按语言猜字体；判断标准是"这段字符串有没有可能包含中文"。
2. **字体来源**：只能引用 `/fonts/NotoSansSC-Regular.woff` 与 `/fonts/NotoSansSC-Bold.woff`
   （已 vendor 到 `public/fonts/`）。**禁止引用任何 CDN 字体 URL**——CDN 抖动会让导出的 PDF 中文缺字。
3. 版式：米白纸底 `#ECE5D6`、炭黑墨 `#191919`、整页 1pt 实线外框、顶部四色条
   （`#4C5A68 / #7A7F4E / #D2A85E / #A8432F` 等分四段）、编号式全大写分区题、页脚 `PAGE n / m`。
4. 每次改动 PDF 后，必须**真实渲染一次并目视检查**中文是否显示，不能只看 TypeScript 通过。
5. 本地渲染校验时，Node 环境把 `/fonts/...` 重定向到磁盘路径属于测试脚手架，不得把该重定向写进生产代码。
6. **断行策略（踩过的坑，禁止回退）**：严禁
   `Font.registerHyphenationCallback((word) => Array.from(word))`。
   那等于把每个字符都声明为断点，会让 `2025-05`、`WebASE-Front`、`BGE-M3`、`@react-pdf/renderer`
   在任意位置被切断，PDF 文本抽取时断点表现为多余空格（`2025- 05`、`@react- pdf/renderer`）。
   正确做法（见 `resume-pdf.tsx` 的 `CJK_SPLIT`）：
   - 只对 CJK 字符逐字断行，拉丁/数字/URL 整段作为不可分片段返回；
   - 中文长段落额外传 `hyphenationPenalty: 10000`，避免断行处被引擎补一个连字符（`侧-`）。
   - 改动 PDF 后必须用**文本抽取**断言关键 token 连续出现，不能只靠肉眼看图。

---

## 3. 架构隔离约束

### 3.1 允许修改（表现层）

- `src/app/globals.css`
- `src/app/layout.tsx`（仅限字体、`<html>` 主题类、全局引入）
- `src/components/ui/*`（shadcn 原语）
- `src/components/**` 中的展示型组件（feature 组件的 JSX 与样式）
- 各页面 `page.tsx` / `layout.tsx` 的 **wrapper 与 className**
- `postcss.config.mjs`（仅在必要时）

### 3.2 绝对禁止修改

1. **`src/app/api/**`** —— 任何 Route Handler 的业务逻辑。
2. **`src/lib/**`** 中的业务逻辑：`deepseek.ts`、`rag.ts`、`embedding.ts`、`prompts.ts`、`supabase/*`。
3. **`supabase/**`** —— schema、RLS、向量索引（pgvector / HNSW）定义。
4. **RAG 检索链路**：`chunkText` / `syncSourceEmbeddings` / `retrieve` / `match_embeddings` 的调用与参数。
5. **`src/middleware.ts`** 与 `src/lib/supabase/middleware.ts` —— 会话刷新与路由守卫。Next 16 关于 middleware 的弃用警告**一律忽略**，不得"顺手修复"或迁移到 `proxy.ts`。
6. 任何数据模型、表结构、环境变量、鉴权判定逻辑。

### 3.3 表现层改动的边界

- 只改**外观**，不改**行为**：不得为了样式改动删除/重排 `onClick`、`onSubmit`、`fetch`、状态机、props 契约。
- 不得为了"好看"而清空或伪造真实数据渲染逻辑。
- 改动业务页面前，先确认该页面依赖的组件没有触碰 §3.2 的模块。

---

## 4. 交付与自测要求

1. 每次改完，必须在真实运行的开发服务上验证，而不是只看代码。
2. 验证项：
   - `getComputedStyle(document.body).backgroundColor` === `rgb(236, 229, 214)`
   - 控制台无新增 error / pageerror
   - 关键页面截图
3. 报告结果时必须区分**已验证**与**未验证**，不许把"应该没问题"写成"已通过"。
4. 回退机制：本项目**没有** `dsh-shadow-rewind` 插件。回退依靠 git 与改动前快照，见 `D:\vibe WEB\.shadow-rewind\<时间戳>\`。
