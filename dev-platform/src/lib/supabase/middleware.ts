import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 需要登录的管理路径（前缀匹配） */
const ADMIN_PREFIXES = [
  "/resume",
  "/interview",
  "/calendar",
  "/settings",
  "/projects/import",
  "/projects/recommended",
  "/blog/new",
  "/blog/edit",
];

function isAdminPath(pathname: string): boolean {
  if (ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // /projects/<id>/edit
  return /^\/projects\/[^/]+\/edit\/?$/.test(pathname);
}

/**
 * 刷新 Supabase 会话 Cookie（@supabase/ssr 标准模式）
 * 未登录用户访问管理路径时重定向到 /login?next=<原路径>
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 不要在 createServerClient 与 getUser 之间执行其他逻辑，可能导致会话随机失效
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAdminPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
