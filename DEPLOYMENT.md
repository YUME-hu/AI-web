# 部署指南（Phase 10）

按顺序执行，约 30–40 分钟可上线。

---

## 第 1 步：创建 Supabase 项目（约 5 分钟）

1. 到 [supabase.com](https://supabase.com) 创建新项目（免费版即可），区域选新加坡或东京
2. 项目创建后，进入 **SQL Editor**，依次执行：
   - `dev-platform/supabase/schema.sql` 全文（建表 + pgvector + 检索函数）
   - `dev-platform/supabase/rls.sql` 全文（行级安全策略）
3. 到 **Settings → API** 记下三个值：`Project URL`、`anon public key`、`service_role key`

## 第 2 步：配置 GitHub OAuth（约 5 分钟）

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**：
   - Homepage URL：本地先填 `http://localhost:3000`（上线后改成 Vercel 域名或再加一个 App）
   - **Authorization callback URL**：`https://<你的项目ref>.supabase.co/auth/v1/callback`（固定格式，必须是 Supabase 的回调，不是你的站点）
2. 拿到 Client ID 和 Client Secret
3. Supabase Dashboard → **Authentication → Sign In / Providers → GitHub**：启用，填入 Client ID/Secret
4. **Authentication → URL Configuration**：Site URL 本地填 `http://localhost:3000`，上线后改为生产域名；Redirect URLs 加上 `http://localhost:3000/auth/callback` 和 `https://<生产域名>/auth/callback`

## 第 3 步：准备 API Key

- DeepSeek：[platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) 创建（确认余额 > 0）
- SiliconFlow：[cloud.siliconflow.cn/account/ak](https://cloud.siliconflow.cn/account/ak) 创建（BGE-M3 免费）

## 第 4 步：本地验证（可选但推荐）

```bash
cd dev-platform
cp .env.example .env.local   # 填入上面的 key
npm run dev
```

验证：打开 `http://localhost:3000` → 右上角「登录」→ GitHub 授权 → 回到站点后应能看到「管理」分组。
登录后到 Supabase **Authentication → Users** 复制你的 UID，填到 `.env.local` 的 `ADMIN_USER_ID`。

## 第 5 步：部署 Vercel（约 10 分钟）

1. 把仓库推到 GitHub（`git remote add origin ... && git push -u origin main`）
2. Vercel → **Add New → Project** → 导入仓库
3. **Root Directory** 设为 `dev-platform`（重要，代码在子目录）
4. Framework 自动识别 Next.js，构建命令保持默认
5. **Environment Variables** 添加（Production）：

| 变量 | 值 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | 第 1 步的 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 第 1 步的 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 第 1 步的 service key |
| `DEEPSEEK_API_KEY` | 第 3 步 |
| `SILICONFLOW_API_KEY` | 第 3 步 |
| `ADMIN_USER_ID` | 你的 Supabase 用户 UID |
| `NEXT_PUBLIC_SITE_URL` | `https://<你的vercel域名>` |
| `DAILY_TOKEN_LIMIT` | `500000`（可调） |

6. Deploy → 等待构建完成
7. 回 Supabase **Authentication → URL Configuration**：Site URL 改为生产域名，Redirect URLs 加上生产回调；GitHub OAuth App 的 Homepage URL 同步改

## 第 6 步：上线后初始化

1. 生产环境登录一次（GitHub OAuth）
2. 导入几个项目（`/projects/import`）+ 发一篇博客
3. **重建向量索引**（RAG 前提）：登录状态下浏览器控制台执行
   ```js
   fetch('/api/admin/reindex', {method: 'POST'}).then(r => r.json()).then(console.log)
   ```
4. `/settings` 填个人信息（首页 Hero 展示）

---

## 验收清单（对照 PRD §十）

部署后逐项验证：

- [ ] 访客可浏览博客、项目列表和详情、个人主页
- [ ] 管理员可登录，进行所有管理操作
- [ ] 上传 README.md 后，AI 能解析并预填项目信息
- [ ] 粘贴 JD 后，AI 能分析并匹配项目库中的项目
- [ ] 可编辑 AI 生成的简历内容并导出 PDF（**实测一次**：确认中文字体从 CDN 加载正常；失败则按 `resume-pdf.tsx` 注释改本地字体）
- [ ] 技能缺口分析能识别缺失技能并推荐项目方案
- [ ] 面试题库能基于 JD 和项目生成分类题目
- [ ] 模拟面试支持多轮对话并生成评估报告
- [ ] AI 知识助手可基于项目库和博客回答访客问题（流式）
- [ ] Token 用量可追踪和统计（`/settings/usage`）
- [ ] 日历正确显示项目和博客事件
- [ ] 热力图正确反映全年开发活跃度
- [ ] 博客支持 Markdown 编辑和代码高亮
- [ ] 全站暗色明日方舟风格一致
- [ ] 移动端基本可用（优先桌面端）
- [ ] 部署到 Vercel 可公开访问

## 已知事项

- **PDF 中文字体**：运行时从 jsdelivr CDN 加载 Noto Sans SC，需联网；导出失败先看控制台字体加载错误
- **免费额度**：Vercel Hobby 版函数超时 60s（简历多步 AI 调用已拆分为独立请求，不会超时）；Supabase 免费版 500MB 数据库足够
- **限流**：`DAILY_TOKEN_LIMIT` 用尽后所有 AI 功能返回中文提示，次日自动恢复
- **OG 分享图**：未生成静态 OG 图（可选优化：`og:image` 指向一张 1200×630 PNG 放到 `public/`）
- **middleware 弃用警告**：Next 16 提示迁移到 `proxy` 约定，功能不受影响
