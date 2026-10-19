"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * 头部认证入口：未登录显示「登录」，已登录显示「退出」
 * 初始渲染为空，待会话检查完成后再显示，避免闪烁
 */
export function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setPending(false);
    router.refresh();
  }

  if (!ready) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-chart-blue"
      >
        <LogIn className="size-3.5" />
        登录
      </Link>
    );
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
    >
      <LogOut className="size-3.5" />
      {pending ? "退出中…" : "退出"}
    </button>
  );
}
