import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/server";
import { ProjectImport } from "@/components/projects/project-import";

export const metadata = { title: "导入项目" };

export default async function ImportProjectPage() {
  // 双重保险：middleware 已拦截，这里再校验一次
  if (!(await isAdmin())) {
    redirect("/login?next=/projects/import");
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-foreground">
          {"// PROJECT IMPORT"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">导入项目</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          粘贴 README 或选择 .md 文件，AI 自动解析为结构化项目信息，确认后入库。
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      <ProjectImport />
    </div>
  );
}
