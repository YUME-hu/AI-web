# Phase 10 · 部署前环境变量与配置核对清单

> 用途：上线前逐项打勾，确认没有"代码改了、配置没跟上"的漏项。
> 基线：NASA-Punk 视觉重构完成后的冻结版本（见文末 Tag）。
> 生成时间：2026-10-19 ｜ 依据：仓库实际文件与实测结果，**不是通用模板**。

---

## 0. 结论速览

| 状态 | 项目 |
|---|---|
| ✅ 已就绪 | 8 个环境变量键中 7 个已填真实值；字体已 vendor 到 `public/fonts/`；`tsc --noEmit` 通过；**`npm run build` exit 0**；全站红色收敛完毕 |
| 🔴 **必须处理** | **`ADMIN_USER_ID` 缺失** → 当前"任何登录用户都是管理员"，上线前必须填 |
| ⚠️ 需你本地复验 | 真实 AI 对话与 PDF 浏览器端导出（本机服务端连不上 Supabase/DeepSeek，这两条只能由你在本地验证） |
| ℹ️ 已知遗留 | 见第 6 节（后台 18 处按钮转圈、手写面板未迁移成 Card、mock 面板未截图验证） |

---

## 1. 环境变量（`.env.local`，实测状态）

在项目根目录执行 `cp .env.example .env.local` 后逐项填写。下表是**当前 `.env.local` 的实测状态**
（只检查是否填写，未打印任何密钥值）：

| 变量 | 必填 | 状态 | 取值来源 / 说明 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 已填 | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 已填 | 同上 → anon public key（会暴露到前端，正常） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 已填 | 同上 → service_role key。**仅服务端使用，绝不能加 `NEXT_PUBLIC_` 前缀** |
| `DEEPSEEK_API_KEY` | ✅ | 已填 | https://platform.deepseek.com/api_keys |
| `SILICONFLOW_API_KEY` | ✅ | 已填 | https://cloud.siliconflow.cn/account/ak （RAG 向量化，缺失则搜索/问答不可用） |
| `ADMIN_USER_ID` | ✅ | 🔴 **缺失** | Supabase → Authentication → Users 里的 UUID |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 已填 | 线上域名，如 `https://your-domain.com`；影响 RSS / sitemap / OAuth 回跳 |
| `DAILY_TOKEN_LIMIT` | ⚪ | 已填 | 单日 AI Token 上限，默认 500000；超限直接拒绝调用 |

### 🔴 关于 `ADMIN_USER_ID`（最高优先级）

`src/middleware.ts` 与 `isAdmin()` 的规则是：**该变量存在时只有它指定的 UID 是管理员；不存在时任何已登录用户都是管理员**。
当前它缺失，等于把管理台对所有能通过 GitHub OAuth 登录的人开放（`/settings`、`/resume`、`/interview`、`/calendar` 全部可进）。

上线前必须：
1. 用 GitHub 账号登录一次站点；
2. 到 Supabase → Authentication → Users 复制该用户的 UUID；
3. 写入 `ADMIN_USER_ID=<uuid>`；
4. 重启服务后访问 `/settings`，确认非管理员账号会被重定向到登录页。

### 其他注意

- `.env.local` 已在 `.gitignore` 中，不会进版本库；**不要**把它提交上来。
- 部署平台（Vercel 等）需在控制台逐条重新配置，`NEXT_PUBLIC_*` 必须在**构建时**就存在，改了要重新部署。

---

## 2. Supabase 侧配置

- [ ] 已按 `supabase/schema.sql` 建表，按 `supabase/rls.sql` 配好 RLS
- [ ] `embeddings` 表已启用 `pgvector`，HNSW 索引已创建（RAG 检索依赖）
- [ ] Authentication → Providers → GitHub 已开启，并填好 Client ID / Secret
- [ ] Authentication → URL Configuration：
  - Site URL = `NEXT_PUBLIC_SITE_URL`
  - Redirect URLs 含 `https://<域名>/auth/callback`
- [ ] `profile` 表存在单行记录（`id = 1`），否则首页会走降级文案「开发者」

---

## 3. 字体与静态资源（本次已改，务必确认）

- [ ] `public/fonts/NotoSansSC-Regular.woff`（约 1.49 MB）
- [ ] `public/fonts/NotoSansSC-Bold.woff`（约 1.51 MB）
- [ ] `src/components/resume/resume-pdf.tsx` 中 `Font.register` 的 `src` 为 `/fonts/NotoSansSC-*.woff`
- [ ] 全仓库**不存在** `cdn.jsdelivr.net` / `fonts.googleapis.com` 的字体引用

验证方式（服务启动后）：

```powershell
# 1) 字体是否可访问（应返回 200 + Content-Type: font/woff）
Invoke-WebRequest http://localhost:3000/fonts/NotoSansSC-Regular.woff -Method Head |
  Select-Object StatusCode, @{n='CT';e={$_.Headers['Content-Type']}}

# 2) 是否有 CDN 残留（应为 0 条）
Select-String -Path (Get-ChildItem src -Recurse -Include *.tsx,*.ts,*.css).FullName `
  -Pattern 'cdn.jsdelivr|fontsource/noto-sans-sc@5' -SimpleMatch
```

实测结果（本机已验证）：字体 HTTP **200**、`Content-Type: font/woff`；
改用本地字体后重新渲染的 PDF 与旧 CDN 版本 **sha256 完全一致**，确认中文字形无变化。

> 说明：`app/layout.tsx` 里 UI 用的 Space Mono 仍走 `next/font/google`（构建期抓取并自托管进产物），
> 与 PDF 字体是两套机制，不冲突。若 CI 完全断网，需要把 Space Mono 也改成本地字体。

---

## 4. 构建前自检（本地执行）

```bash
npx tsc --noEmit     # 类型检查（本机已通过）
npm run lint         # ESLint
npm run build        # 生产构建：必须成功，且无 "Failed to fetch" 相关报错
```

- [x] `tsc --noEmit` 退出码 0（已实测）
- [x] `npm run build` 成功，exit 0；路由表已包含 `/`、`/projects`、`/blog`、`/chat`、`/resume`、`/interview`、`/calendar`、`/settings`（已实测）
- [ ] 构建日志中 `middleware` 的弃用警告**可以忽略**（Next 16 构建产物里把它标为 `ƒ Proxy (Middleware)`，本项目决定不迁移，见 AGENTS.md §3.2）
- [ ] `npm start` 跑一次，确认 `/fonts/*.woff` 仍返回 200（`public/` 静态资源，正常会带进产物）

---

## 5. 部署后一次性动作

- [ ] 调一次 `POST /api/admin/reindex`（需管理员会话），为已有项目/博客建立向量索引；
      不做这一步，RAG 助手会答"没有检索到相关内容"
- [ ] 访问 `/` 确认首页 4 张统计卡数字正确
- [ ] 访问 `/chat`，真实提一个问题，确认流式输出与 `[SYS_LOG // 时间戳]` 标签正常
- [ ] 访问 `/settings/usage`，确认数据表格边框、hover 态、模块徽标配色正常
- [ ] 进 `/resume` 生成一份简历并点「导出 PDF」，**打开 PDF 确认中文没有缺字**（这是字体 vendor 的最终验证）

---

## 6. 已知遗留项（不阻塞上线，但要知情）

1. **后台仍有 18 处按钮转圈**（`Loader2 + animate-spin`，分布在 interview / projects / resume / settings 的表单里）。
   终端的转圈已全部清除；按钮级的加载指示保留了，因为文字型加载在按钮里更占位。
   若要彻底统一成 `[ LOADING... ]`，需要逐个人工确认文案。
2. **部分后台面板仍是 `<div className="card-hazard rivet ...">`**，视觉与 `<Card>` 等价但语义未迁移。
   后续改动碰到时顺手换掉即可（AGENTS.md §2.3 已写明）。
3. **`/interview/mock` 终端面板未截图验证**：该路由需管理员登录，而本机服务端无法访问 Supabase，
   登录链路跑不通。代码与 `/chat` 共用同一套类名与结构，`tsc` 通过。
4. **`.dsh-pdf/` 构建临时目录**：本地渲染 PDF 的脚手架产物，已删除；不应出现在仓库里。
5. **`CLAUDE.md` 未纳入版本库**（一直处于 untracked 状态），是否提交由你决定。
6. 旧的 `text-glow-primary` / `bg-grid` 等类名保留为兼容壳（已无发光/旧配色），可择期清理。

---

## 7. 回退方案

本次重构分 4 个提交，可逐段回退：

| 提交 | 内容 |
|---|---|
| `70b34ac` | 第一轮：设计令牌 / Button / Card / AGENTS.md |
| `220303d` | 第二轮：任务徽章 / 编号导航 / 压缩顶栏 / 四色条 / 蓝图网格 |
| `09849fb` | 第三轮：星空色板 / 红色收敛 / Card 新规格 / Input 光标 / 图表热力图 |
| `eac7f40` | 第四轮：语义红归位 / 终端面板 / PDF 人员档案 |
| 冻结 Tag | 见第 8 节 |

```bash
git checkout <commit>        # 临时回到某个阶段
git revert <commit>          # 撤销某一段
git checkout <tag> -- src/   # 只回退源码到冻结基线
```

改动前的原始文件快照另存于 `D:\vibe WEB\.shadow-rewind\20261019-174024\`（第一轮动手前的 4 个文件）。

---

## 8. 冻结基线

- **Tag**：`v1.0-nasa-punk`
- **含义**：NASA-Punk 视觉重构完成、可用于真实联调与上线的 UI 基线
- 打 Tag 之后，任何视觉改动都应新开 commit，不要 amend 这个 Tag

```bash
git tag -n99 v1.0-nasa-punk          # 查看说明
git show --stat v1.0-nasa-punk       # 查看该基线包含的改动
```
