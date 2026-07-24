import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { FolderGit2, Hexagon } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata = { title: "登录" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/";

  // 已登录则直接进入目标页
  const user = await getUser();
  if (user) redirect(safeNext);

  async function signInWithGithub() {
    "use server";
    const supabase = await createClient();
    const origin =
      (await headers()).get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    if (error || !data.url) {
      redirect(
        `/login?error=${encodeURIComponent(error?.message ?? "OAuth 初始化失败")}`,
      );
    }
    redirect(data.url);
  }

  return (
    <div className="bg-grid-sm flex min-h-dvh items-center justify-center px-4">
      <div className="clip-corner w-full max-w-sm border border-border bg-card p-8">
        <div className="flex items-center gap-2">
          <Hexagon className="size-5 text-primary" />
          <p className="font-mono text-sm font-bold tracking-wider">
            DEV<span className="text-primary">_</span>PLATFORM
          </p>
        </div>

        <p className="mt-6 font-mono text-[10px] tracking-[0.3em] text-primary">
          {"// ACCESS CONTROL"}
        </p>
        <h1 className="mt-2 text-xl font-bold">登录管理控制台</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          使用 GitHub 账号登录以获得管理权限；访客可直接浏览公开内容。
        </p>

        {error && (
          <p className="mt-4 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <form action={signInWithGithub} className="mt-6">
          <Button type="submit" size="lg" className="w-full rounded-sm">
            <FolderGit2 className="size-4" />
            使用 GitHub 登录
          </Button>
        </form>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            ← 返回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
