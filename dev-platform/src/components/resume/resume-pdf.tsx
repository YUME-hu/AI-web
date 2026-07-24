import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ResumeProfile } from "@/lib/types";

/**
 * 简历 PDF 文档（ATS 友好：A4 单栏、白底黑字、标准层级）
 * 注意：PDF 是打印物，不使用站内暗色主题
 */

// 中文渲染：@react-pdf/renderer 内置字体（Helvetica 等）不支持 CJK。
// 注册思源黑体两个字重，字体文件在 PDF 生成时从 CDN 加载（jsdelivr 支持 CORS）。
// 若 CDN 不可达：下载字体 woff 到 public/fonts/，把 src 改为 "/fonts/NotoSansSC-Regular.woff" 等本地路径。
Font.register({
  family: "NotoSansSC",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5/files/noto-sans-sc-chinese-simplified-400-normal.woff",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5/files/noto-sans-sc-chinese-simplified-700-normal.woff",
      fontWeight: 700,
    },
  ],
});

// 中文无空格分词，按单字断行使中文段落可以正常换行
Font.registerHyphenationCallback((word) => Array.from(word));

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 46,
    fontFamily: "NotoSansSC",
    fontSize: 10,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
  name: { fontSize: 22, fontWeight: 700 },
  contactLine: { marginTop: 5, fontSize: 9, color: "#333333" },
  divider: {
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  project: { marginBottom: 10 },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  projectTitle: { fontSize: 11, fontWeight: 700 },
  projectDate: { fontSize: 8.5, color: "#444444" },
  techLine: { marginTop: 2, fontSize: 8.5, color: "#444444" },
  description: { marginTop: 3, fontSize: 9.5, lineHeight: 1.55 },
  skillsLine: { fontSize: 9.5, lineHeight: 1.6 },
});

export interface ResumePdfProject {
  title: string;
  dateRange: string | null;
  techStack: string[];
  description: string;
}

export interface ResumePdfData {
  profile: ResumeProfile;
  targetRole: string;
  projects: ResumePdfProject[];
  skills: string[];
}

export function ResumePdf({ data }: { data: ResumePdfData }) {
  const contact = [
    data.profile.title,
    data.profile.email,
    data.profile.github,
    data.profile.website,
  ]
    .filter(Boolean)
    .join("  |  ");

  return (
    <Document title={`简历 - ${data.profile.name || data.targetRole || "未命名"}`}>
      <Page size="A4" style={styles.page}>
        {/* 头部：姓名 → 职位+联系方式一行 → 分割线 */}
        <Text style={styles.name}>{data.profile.name || "（姓名）"}</Text>
        {contact ? <Text style={styles.contactLine}>{contact}</Text> : null}
        <View style={styles.divider} />

        {/* 项目经历 */}
        <Text style={styles.sectionTitle}>项目经历</Text>
        {data.projects.map((project, index) => (
          <View key={index} style={styles.project}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              {project.dateRange ? (
                <Text style={styles.projectDate}>{project.dateRange}</Text>
              ) : null}
            </View>
            {project.techStack.length > 0 ? (
              <Text style={styles.techLine}>
                技术栈：{project.techStack.join(" / ")}
              </Text>
            ) : null}
            <Text style={styles.description}>{project.description}</Text>
          </View>
        ))}

        {/* 技能（从勾选项目的 tech_stack 聚合去重） */}
        {data.skills.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>技能</Text>
            <Text style={styles.skillsLine}>{data.skills.join("  ·  ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
