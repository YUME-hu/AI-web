"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { ResumePdf, type ResumePdfData } from "./resume-pdf";

// PDFDownloadLink 依赖浏览器环境渲染，关闭 SSR 按需加载
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <span className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
        加载导出组件…
      </span>
    ),
  },
);

export function PdfExportButton({
  data,
  fileName,
}: {
  data: ResumePdfData;
  fileName: string;
}) {
  return (
    <PDFDownloadLink
      document={<ResumePdf data={data} />}
      fileName={fileName}
      className="flex items-center gap-1.5 border border-foreground bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-none hover:bg-foreground hover:text-background"
    >
      {({ loading }) => (
        <>
          <Download className="size-3.5" />
          {loading ? "生成 PDF…" : "导出 PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
