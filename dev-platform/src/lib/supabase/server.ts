import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 服务端 Supabase 客户端（Server Components / Route Handlers 中使用）
 * 携带用户会话，受 RLS 约束
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 中调用时忽略（由 middleware 刷新会话）
          }
        },
      },
    },
  );
}

/**
 * 获取当前登录用户，未登录返回 null
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 判断当前用户是否为管理员（单人平台：登录即管理员）
 */
export async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  const adminId = process.env.ADMIN_USER_ID;
  // 未配置 ADMIN_USER_ID 时，任何登录用户都是管理员
  return !adminId || user.id === adminId;
}
