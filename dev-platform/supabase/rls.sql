-- ============================================
-- RLS 策略：访客只读公开内容，管理员全权
-- 在 schema.sql 之后执行
-- 前提：.env.local 中 ADMIN_USER_ID = 你的 Supabase 用户 UID
-- ============================================

-- 判断当前用户是否为管理员（通过 JWT claims 中的 sub）
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 说明：本平台为单人平台，任何登录用户即管理员（只开放一个账号）。
-- 如需多管理员，改为 auth.uid() = ANY (ARRAY['uuid-1'::uuid, ...])

-- ---------- projects ----------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读已发布项目" ON projects
  FOR SELECT USING (is_published = TRUE OR is_admin());
CREATE POLICY "管理员写项目" ON projects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- blog_posts ----------
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读已发布文章" ON blog_posts
  FOR SELECT USING (is_published = TRUE OR is_admin());
CREATE POLICY "管理员写文章" ON blog_posts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- calendar_events ----------
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读日历事件" ON calendar_events
  FOR SELECT USING (TRUE);
CREATE POLICY "管理员写日历事件" ON calendar_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- 以下表仅管理员可见 ----------
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理员读写简历" ON resumes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理员读写面试题" ON interview_questions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理员读写模拟面试" ON mock_interviews
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE recommended_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理员读写推荐项目" ON recommended_projects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
-- 向量内容来自公开数据，访客问答需要读权限
CREATE POLICY "公开读向量" ON embeddings
  FOR SELECT USING (TRUE);
CREATE POLICY "管理员写向量" ON embeddings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
-- 访客问答会产生会话记录，允许匿名插入/按 session 读取
CREATE POLICY "匿名写会话" ON chat_sessions
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "按会话读" ON chat_sessions
  FOR SELECT USING (TRUE);
CREATE POLICY "管理员管会话" ON chat_sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理员读写用量日志" ON ai_usage_logs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
