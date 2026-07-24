/**
 * Phase 9 个人信息读取（服务端）
 * profile 是单行表（id=1），行不存在时返回 null（尚未执行 schema 时也不报错）
 */
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single();
    if (error || !data) return null;
    return data as Profile;
  } catch {
    return null;
  }
}
