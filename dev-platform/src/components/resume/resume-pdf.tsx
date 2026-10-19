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
 * 简历 PDF —— NASA-Punk「人员档案」版式
 *
 * 与站内一致的工业档案气质：米白纸底 #ECE5D6、炭黑墨 #191919、
 * 1px 实线边框、顶部四色复古条、编号式等宽标签。
 *
 * 字体策略：Courier 是 PDF 标准 14 字体之一，只用于纯 ASCII 标签
 * （react-pdf 不做逐字形回退，中文字符放进 Courier 会丢字）；
 * 一切可能含中文的内容都用已注册的思源黑体。
 */

// 中文渲染：@react-pdf/renderer 内置字体（Helvetica 等）不支持 CJK。
// 字体已 vendor 到 public/fonts/，走同源路径加载，不再依赖任何 CDN
// （旧实现引用 jsdelivr，CDN 抖动会直接导致 PDF 中文缺字）。
Font.register({
  family: "NotoSansSC",
  fonts: [
    {
      src: "/fonts/NotoSansSC-Regular.woff",
      fontWeight: 400,
    },
    {
      src: "/fonts/NotoSansSC-Bold.woff",
      fontWeight: 700,
    },
  ],
});

// 断行策略：中文必须能逐字断行（否则没有空格可分，会整段溢出），
// 但拉丁词 / 数字 / 技术栈 / URL 必须整段不可分。
//
// ⚠️ 旧实现 `Array.from(word)` 把每个字符都当成断点，导致
// 2025-05、WebASE-Front、BGE-M3、@react-pdf/renderer 在任意位置被切断，
// PDF 文本抽取时断点表现为多余空格（如 "2025- 05"、"@react- pdf/renderer"）。
const CJK_CHAR = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
// 切成「一个 CJK 字符」或「一整段非 CJK 字符」
const CJK_SPLIT = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|[^\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;

Font.registerHyphenationCallback((word) => {
  // 纯拉丁/数字/符号：整词作为一个不可分片段返回
  if (!CJK_CHAR.test(word)) return [word];
  return word.match(CJK_SPLIT) ?? [word];
});

const INK = "#191919";
const PAPER = "#ECE5D6";
const MUTED = "#5A554C";

const MONO = "Courier";
const CJK = "NotoSansSC";

/**
 * 中文段落断行的代价系数。
 *
 * react-pdf 的连字符是引擎结构性的（textkit 里 hyphenWidth 硬编码为 5，
 * 每次在 syllable 之间断行都会画一个 "-"），这一版没有关闭开关。
 * 但 `<Text>` 支持运行时属性 hyphenationPenalty（类型未声明，故此处做一次收窄），
 * 把它调高能显著提高"在汉字中间断行"的代价，让引擎优先在空格处断——
 * 纯中文长段落仍可能断在字间，但中英混排的正文基本不会再多出连字符。
 */
const CJK_LINE_OPTIONS: Record<string, number> = {
  hyphenationPenalty: 10000,
};

const styles = StyleSheet.create({
  // 整页就是一张档案纸：米白底 + 1px 炭黑外框
  page: {
    backgroundColor: PAPER,
    color: INK,
    borderWidth: 1,
    borderColor: INK,
    fontFamily: CJK,
    fontSize: 9.5,
    paddingBottom: 0,
  },

  // 顶部四色复古条（等分四段，纯色块拼接）
  flagBar: { flexDirection: "row", height: 7 },

  body: {
    paddingTop: 16,
    paddingHorizontal: 26,
    paddingBottom: 46,
  },

  /* ---- 抬头 ---- */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kicker: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 1.8,
    color: MUTED,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1.2,
    marginTop: 5,
  },
  role: { fontSize: 10.5, letterSpacing: 0.5, marginTop: 3 },
  contact: {
    fontFamily: CJK,
    fontSize: 8,
    color: MUTED,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  /* 右上角印章 */
  stamp: {
    borderWidth: 1,
    borderColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    marginLeft: 14,
  },
  stampTop: { fontFamily: MONO, fontSize: 6.5, letterSpacing: 1.4 },
  stampBig: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    marginTop: 3,
  },
  stampSub: {
    fontFamily: MONO,
    fontSize: 6,
    letterSpacing: 1,
    color: MUTED,
    marginTop: 3,
  },

  /* 三格元信息条 */
  metaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: INK,
    marginTop: 14,
  },
  metaCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 7 },
  metaCellDiv: { borderLeftWidth: 1, borderLeftColor: INK },
  metaLabel: {
    fontFamily: MONO,
    fontSize: 6,
    letterSpacing: 1.2,
    color: MUTED,
  },
  metaValue: { fontFamily: CJK, fontSize: 8.5, marginTop: 2 },

  /* 分区标题：[01] PROJECTS 项目经历 ———— */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionNo: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1,
    marginRight: 6,
  },
  sectionEn: {
    fontFamily: MONO,
    fontSize: 8.5,
    letterSpacing: 2.2,
  },
  sectionCn: {
    fontFamily: CJK,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    marginLeft: 8,
  },
  sectionFill: {
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: INK,
    marginLeft: 10,
    marginTop: 2,
  },

  /* 项目块 */
  project: {
    borderWidth: 1,
    borderColor: INK,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 7,
  },
  projectTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  projectTitle: { fontFamily: CJK, fontSize: 10.5, fontWeight: 700 },
  projectDate: { fontFamily: MONO, fontSize: 7.5, color: MUTED },
  tech: {
    fontFamily: MONO,
    fontSize: 7.5,
    color: MUTED,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  desc: { fontFamily: CJK, fontSize: 9, lineHeight: 1.6, marginTop: 4 },

  /* 技能 chips */
  skillsWrap: { flexDirection: "row", flexWrap: "wrap" },
  skillChip: {
    borderWidth: 1,
    borderColor: INK,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 8,
    marginRight: 4,
    marginBottom: 4,
  },

  /* 页脚（每页重复） */
  footer: {
    position: "absolute",
    bottom: 14,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: INK,
    paddingTop: 4,
  },
  footerText: {
    fontFamily: MONO,
    fontSize: 6,
    letterSpacing: 1.1,
    color: MUTED,
  },
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

const FLAG_COLORS = ["#4C5A68", "#7A7F4E", "#D2A85E", "#A8432F"];

/** [01] PROJECTS 项目经历 ———— */
function SectionHead({
  no,
  en,
  cn,
}: {
  no: string;
  en: string;
  cn: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionNo}>[{no}]</Text>
      <Text style={styles.sectionEn}>{en}</Text>
      <Text style={styles.sectionCn}>{cn}</Text>
      <View style={styles.sectionFill} />
    </View>
  );
}

export function ResumePdf({ data }: { data: ResumePdfData }) {
  const contact = [
    data.profile.title,
    data.profile.email,
    data.profile.github,
    data.profile.website,
  ]
    .filter(Boolean)
    .join("  /  ");

  const issued = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  return (
    <Document
      title={`人员档案 - ${data.profile.name || data.targetRole || "未命名"}`}
      author={data.profile.name}
    >
      <Page size="A4" style={styles.page}>
        {/* 顶部四色条 */}
        <View style={styles.flagBar}>
          {FLAG_COLORS.map((c) => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>

        <View style={styles.body}>
          {/* 抬头 */}
          <View style={styles.headerRow}>
            <View style={{ flexGrow: 1, flexShrink: 1 }}>
              <Text style={styles.kicker}>
                {"PERSONNEL FILE  //  PERSONAL DEVELOPER PLATFORM"}
              </Text>
              <Text style={styles.name}>{data.profile.name || "（姓名）"}</Text>
              {data.targetRole ? (
                <Text style={styles.role}>{data.targetRole}</Text>
              ) : null}
              {contact ? <Text style={styles.contact}>{contact}</Text> : null}
            </View>

            <View style={styles.stamp}>
              <Text style={styles.stampTop}>ARCHIVE</Text>
              <Text style={styles.stampBig}>NO.01</Text>
              <Text style={styles.stampSub}>DO NOT ALTER</Text>
            </View>
          </View>

          {/* 元信息 */}
          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>FILE_NO</Text>
              <Text style={styles.metaValue}>DP-{issued.replace(/\./g, "")}</Text>
            </View>
            <View style={[styles.metaCell, styles.metaCellDiv]}>
              <Text style={styles.metaLabel}>ISSUED</Text>
              <Text style={styles.metaValue}>{issued}</Text>
            </View>
            <View style={[styles.metaCell, styles.metaCellDiv]}>
              <Text style={styles.metaLabel}>TARGET_ROLE</Text>
              <Text style={styles.metaValue}>{data.targetRole || "—"}</Text>
            </View>
          </View>

          {/* 项目经历 */}
          <SectionHead no="01" en="PROJECTS" cn="项目经历" />
          {data.projects.map((project, index) => (
            <View key={index} style={styles.project} wrap={false}>
              <View style={styles.projectTop}>
                <Text style={styles.projectTitle} {...CJK_LINE_OPTIONS}>
                  {project.title}
                </Text>
                {project.dateRange ? (
                  <Text style={styles.projectDate}>{project.dateRange}</Text>
                ) : null}
              </View>
              {project.techStack.length > 0 ? (
                <Text style={styles.tech}>
                  {`TECH_STACK :: ${project.techStack.join(" / ")}`}
                </Text>
              ) : null}
              <Text style={styles.desc} {...CJK_LINE_OPTIONS}>
                {project.description}
              </Text>
            </View>
          ))}

          {/* 技能 */}
          {data.skills.length > 0 ? (
            <View>
              <SectionHead no="02" en="SKILLS" cn="技能" />
              <View style={styles.skillsWrap}>
                {data.skills.map((s, i) => (
                  <Text key={i} style={styles.skillChip}>
                    {s}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* 页脚 */}
        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>
            {"DEV_PLATFORM  //  PERSONNEL ARCHIVE"}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `PAGE ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
