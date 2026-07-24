import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { PostEditor } from "@/components/blog/post-editor";

export const metadata = { title: "写博客" };

export default async function BlogNewPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/blog/new");
  }

  // 关联项目下拉数据
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// NEW POST"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">写博客</h1>
        <div className="divider-tactical mt-6" />
      </section>

      <PostEditor projects={projects ?? []} />
    </div>
  );
}
