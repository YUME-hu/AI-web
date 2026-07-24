import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GitHub OAuth 回调：用 code 换取会话，然后跳回 next 或首页
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  // 仅允许站内路径，防开放重定向
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("登录失败，请重试")}`,
  );
}
