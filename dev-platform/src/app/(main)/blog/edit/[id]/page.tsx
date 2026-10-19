import { notFound, redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { BlogPost, BlogPostFormValues } from "@/lib/types";
import { PostEditor } from "@/components/blog/post-editor";

export const metadata = { title: "编辑文章" };

export default async function BlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = await createClient();
  const [{ data: post }, { data: projects }] = await Promise.all([
    supabase.from("blog_posts").select("*").eq("id", id).single(),
    supabase
      .from("projects")
      .select("id, title")
      .order("updated_at", { ascending: false }),
  ]);
  if (!post) notFound();

  const p = post as BlogPost;
  const initialValues: BlogPostFormValues = {
    title: p.title,
    slug: p.slug,
    content: p.content,
    category: p.category,
    tags: p.tags ?? [],
    linked_project_id: p.linked_project_id ?? "",
    is_published: p.is_published,
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-foreground">
          {"// EDIT POST"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          编辑：{p.title}
        </h1>
        <div className="divider-tactical mt-6" />
      </section>

      <PostEditor
        postId={id}
        initialValues={initialValues}
        projects={projects ?? []}
      />
    </div>
  );
}
