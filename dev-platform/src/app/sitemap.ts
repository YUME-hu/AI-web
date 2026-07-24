import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import type { BlogPost, Project } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = ["", "/projects", "/blog", "/chat"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.8,
    }),
  );

  try {
    const supabase = createServiceClient();
    const [{ data: posts }, { data: projects }] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("slug, published_at, updated_at")
        .eq("is_published", true),
      supabase.from("projects").select("id, updated_at").eq("is_published", true),
    ]);

    const postRoutes: MetadataRoute.Sitemap = (
      (posts ?? []) as Pick<BlogPost, "slug" | "published_at" | "updated_at">[]
    ).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updated_at ?? post.published_at ?? undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const projectRoutes: MetadataRoute.Sitemap = (
      (projects ?? []) as Pick<Project, "id" | "updated_at">[]
    ).map((project) => ({
      url: `${siteUrl}/projects/${project.id}`,
      lastModified: project.updated_at,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...postRoutes, ...projectRoutes];
  } catch {
    // Supabase 未配置时只输出静态路由
    return staticRoutes;
  }
}
