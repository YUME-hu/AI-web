import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildBlogText,
  buildProjectText,
  deleteSourceEmbeddings,
  syncSourceEmbeddings,
} from "@/lib/rag";
import type { BlogPost, Project } from "@/lib/types";

/**
 * POST /api/admin/reindex — 重建全量向量索引（仅管理员）
 * 用于首次索引存量数据 + 故障恢复；单个来源失败不中断整体
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const [{ data: projects }, { data: posts }] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("blog_posts").select("*").eq("is_published", true),
  ]);

  let chunks = 0;
  let projectsOk = 0;
  let blogsOk = 0;
  const errors: string[] = [];

  // 全部项目参与遍历：已发布的同步索引，未发布的清除残留索引（防泄露）
  for (const project of (projects ?? []) as Project[]) {
    try {
      if (project.is_published) {
        chunks += await syncSourceEmbeddings(
          "project",
          project.id,
          buildProjectText(project),
        );
        projectsOk++;
      } else {
        await deleteSourceEmbeddings("project", project.id);
      }
    } catch (err) {
      errors.push(
        `项目「${project.title}」索引失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  for (const post of (posts ?? []) as BlogPost[]) {
    try {
      chunks += await syncSourceEmbeddings("blog", post.id, buildBlogText(post));
      blogsOk++;
    } catch (err) {
      errors.push(
        `文章「${post.title}」索引失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json({
    projects: projectsOk,
    blogs: blogsOk,
    chunks,
    ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
  });
}
