import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role 客户端：绕过 RLS，仅在服务端 API Routes 使用
 * 用于：Embedding 写入、AI 用量日志、访客会话写入等匿名场景
 * 切勿导入到任何 Client Component
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 未配置",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
