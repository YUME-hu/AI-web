import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GitHub OAuth 回调：用 code 换取会话，然后跳回 next 或首页
 *
 * 失败原因必须可见：
 * - Supabase / GitHub 直接回传的 error / error_description 要透传；
 * - exchangeCodeForSession 返回的 error.message 不能再被丢弃；
 * - 底层抛异常时也不能变成 500 白屏。
 * 生产环境统一脱敏为「登录失败，请重试」，开发环境透传真实原因。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  // 仅允许站内路径，防开放重定向
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const isProd = process.env.NODE_ENV === "production";
  const mask = (msg: string) => (isProd ? "登录失败，请重试" : msg);

  const fail = (detail: string) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(mask(detail))}`,
    );

  // Supabase / GitHub 在重定向前就报错时会带这些参数回来（如用户取消授权）
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return fail(`授权被拒绝：${oauthError}`);
  }

  if (!code) {
    return fail("回调缺少 code 参数（可能是 redirect URL 未白名单，或 code 已被消费）");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return fail(`换取会话失败：${error.message}`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知异常";
    return fail(`回调异常：${msg}`);
  }
}
