import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/supabase/server";
import { chatCompletionJson, DeepSeekError } from "@/lib/deepseek";
import type { ProjectParseResult } from "@/lib/types";

const SYSTEM_PROMPT =
  "你是一个项目信息提取专家。请从用户提供的 README 内容中提取结构化项目信息。只返回 JSON，不要其他文字。";

const FORMAT_PROMPT = `要求返回 JSON 格式：{"name":"项目名称","description":"一句话简介（50字内）","techStack":["技术1"],"features":["核心功能1"],"highlights":["技术亮点1"],"role":"角色/职责","startDate":"YYYY-MM（如果可推断，否则null）","endDate":"YYYY-MM 或 null","repoUrl":"仓库地址（如果有，否则null）","demoUrl":"预览地址（如果有，否则null）"}`;

// README 可能很长，截断以防止超出模型上下文
const MAX_README_LENGTH = 30_000;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

/**
 * POST /api/projects/parse — AI 解析 README 为结构化项目信息（仅管理员）
 * 不落库，由用户确认后走 POST /api/projects
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const { readme } = (await request.json()) as { readme?: string };
  if (!readme?.trim()) {
    return NextResponse.json({ error: "README 内容不能为空" }, { status: 400 });
  }

  try {
    const { data } = await chatCompletionJson<ProjectParseResult>([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `请从以下 README 内容中提取项目信息。\n\n${readme.slice(0, MAX_README_LENGTH)}\n\n${FORMAT_PROMPT}`,
      },
    ], { trackModule: "project_import" });

    // 数组字段容错，避免模型返回非数组导致表单异常
    const parsed: ProjectParseResult = {
      name: data.name ?? null,
      description: data.description ?? null,
      techStack: asStringArray(data.techStack),
      features: asStringArray(data.features),
      highlights: asStringArray(data.highlights),
      role: data.role ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      repoUrl: data.repoUrl ?? null,
      demoUrl: data.demoUrl ?? null,
    };
    return NextResponse.json({ parsed });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        { error: `AI 解析失败：${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "解析服务异常，请稍后重试" }, { status: 500 });
  }
}
