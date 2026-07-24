-- ============================================
-- 个人开发者平台 — 数据库初始化脚本
-- 对应 PRD_v2 §5.1，在 Supabase SQL Editor 中执行
-- ============================================

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

-- ========== updated_at 自动更新 ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 向量检索函数（Phase 5 RAG 使用） ==========
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  source_type TEXT,
  source_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    e.source_type,
    e.source_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
