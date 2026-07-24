import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FilePlus2 } from "lucide-react";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { Resume } from "@/lib/types";

export const metadata = { title: "简历历史版本" };

type ResumeListItem = Pick<
  Resume,
  "id" | "target_role" | "created_at" | "selected_project_ids"
>;

function formatDateTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export default async function ResumeHistoryPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/resume/history");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("id, target_role, created_at, selected_project_ids")
    .order("created_at", { ascending: false });
  const resumes = (data ?? []) as ResumeListItem[];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-primary">
            {"// RESUME ARCHIVE"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">简历历史版本</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {resumes.length} 个版本，点击进入可继续编辑
          </p>
        </div>
        <Link
          href="/resume"
          className="flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
        >
          <FilePlus2 className="size-3.5" />
          新建简历
        </Link>
      </section>

      <div className="divider-tactical" />

      {resumes.length > 0 ? (
        <ul className="space-y-2">
          {resumes.map((resume) => (
            <li key={resume.id}>
              <Link
                href={`/resume/${resume.id}`}
                className="group flex items-center gap-4 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold transition-colors group-hover:text-primary">
                    {resume.target_role ?? "未命名岗位"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(resume.created_at)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  匹配项目 {resume.selected_project_ids?.length ?? 0}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            {"// NO DATA"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            暂无简历版本，去新建一份吧
          </p>
        </div>
      )}
    </div>
  );
}
