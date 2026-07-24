import { NextResponse, type NextRequest } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import type { ProfileFormValues } from "@/lib/types";

/** GET /api/profile — 公开读取个人信息（单行） */
export async function GET() {
  const profile = await getProfile();
  return NextResponse.json({ profile });
}

/** URL 字段校验：http(s) 开头或空 */
function validUrl(value: string): boolean {
  if (!value) return true;
  return /^https?:\/\/.+/.test(value);
}

/** PATCH /api/profile — 更新个人信息（仅管理员，upsert id=1） */
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权：需要管理员登录" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ProfileFormValues>;

  if (body.name !== undefined && body.name.length > 50) {
    return NextResponse.json({ error: "姓名不能超过 50 字" }, { status: 400 });
  }
  if (body.bio !== undefined && body.bio.length > 500) {
    return NextResponse.json({ error: "简介不能超过 500 字" }, { status: 400 });
  }
  for (const key of ["github", "website", "avatar_url"] as const) {
    const value = body[key];
    if (value !== undefined && !validUrl(value.trim())) {
      return NextResponse.json(
        { error: "链接字段需以 http(s):// 开头或留空" },
        { status: 400 },
      );
    }
  }

  const row: Record<string, unknown> = { id: 1 };
  if (body.name !== undefined) row.name = body.name.trim() || null;
  if (body.title !== undefined) row.title = body.title.trim() || null;
  if (body.bio !== undefined) row.bio = body.bio.trim() || null;
  if (body.email !== undefined) row.email = body.email.trim() || null;
  if (body.github !== undefined) row.github = body.github.trim() || null;
  if (body.website !== undefined) row.website = body.website.trim() || null;
  if (body.avatar_url !== undefined)
    row.avatar_url = body.avatar_url.trim() || null;
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      return NextResponse.json({ error: "skills 必须是数组" }, { status: 400 });
    }
    row.skills = body.skills;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile")
    .upsert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `保存失败：${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
