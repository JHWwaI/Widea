/**
 * 회의록 → .docx 빌더.
 * 5종 템플릿(DEFAULT/STANDUP/INVESTOR/USER_INTERVIEW/RETRO) × 3종 디자인 공용.
 *
 * 디자인:
 *  - classic   : 헤딩 + 글머리표 + 표 (기본)
 *  - minimal   : 라인 구분선 위주, 표 없이 인라인 리스트
 *  - business  : 모든 섹션을 표로 정형화 — 결재/회사 문서식
 *
 * 백엔드 src/lib/meetingTemplates.ts 의 prompt JSON 스키마와 1:1 매칭되는
 * "프론트용 sections 정의"를 여기서도 한번 더 두어 라벨/이모지/순서를 관리한다.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";
import { type MeetingTemplateKey } from "./meetingTemplates.js";

type SectionKind = "stringList" | "actionList" | "qaList";

type DocxSection = {
  field: string;
  label: string;
  kind: SectionKind;
  emoji?: string;
  /** 빈 양식에서 보여줄 placeholder 줄 수 */
  blankRows?: number;
};

type DocxTemplateMeta = {
  key: MeetingTemplateKey;
  label: string;
  emoji: string;
  description: string;
  sections: DocxSection[];
};

const DOCX_TEMPLATES: Record<MeetingTemplateKey, DocxTemplateMeta> = {
  DEFAULT: {
    key: "DEFAULT",
    label: "팀 정기 회의",
    emoji: "📝",
    description: "핵심 요약 · 결정 사항 · 액션 아이템 · 다음 단계",
    sections: [
      { field: "keyPoints", label: "핵심 요약", kind: "stringList", blankRows: 5 },
      { field: "decisions", label: "결정 사항", kind: "stringList", emoji: "✅", blankRows: 4 },
      { field: "actions", label: "액션 아이템", kind: "actionList", emoji: "📋", blankRows: 5 },
      { field: "nextSteps", label: "다음 단계", kind: "stringList", emoji: "🔜", blankRows: 4 },
    ],
  },
  STANDUP: {
    key: "STANDUP",
    label: "데일리 스탠드업",
    emoji: "☀️",
    description: "어제 한 일 / 오늘 할 일 / 블로커",
    sections: [
      { field: "yesterday", label: "어제 한 일", kind: "actionList", blankRows: 4 },
      { field: "today", label: "오늘 할 일", kind: "actionList", blankRows: 4 },
      { field: "blockers", label: "블로커", kind: "actionList", emoji: "🚧", blankRows: 3 },
    ],
  },
  INVESTOR: {
    key: "INVESTOR",
    label: "투자자 · 파트너 미팅",
    emoji: "💰",
    description: "Q&A · 우려 사항 · 요청 자료 · 다음 단계",
    sections: [
      { field: "qa", label: "Q & A", kind: "qaList", emoji: "💬", blankRows: 5 },
      { field: "concerns", label: "우려 사항", kind: "stringList", emoji: "⚠", blankRows: 4 },
      { field: "followUps", label: "요청 자료 · FU", kind: "stringList", emoji: "📎", blankRows: 4 },
      { field: "nextSteps", label: "다음 단계", kind: "stringList", emoji: "🔜", blankRows: 3 },
    ],
  },
  USER_INTERVIEW: {
    key: "USER_INTERVIEW",
    label: "고객 · 유저 인터뷰",
    emoji: "🎤",
    description: "페인포인트 · 인사이트 · 가설 검증 · 직접 인용",
    sections: [
      { field: "painPoints", label: "페인포인트", kind: "stringList", emoji: "🩹", blankRows: 4 },
      { field: "insights", label: "인사이트", kind: "stringList", emoji: "💡", blankRows: 4 },
      { field: "hypothesesValidated", label: "검증된 가설", kind: "stringList", emoji: "✅", blankRows: 3 },
      { field: "hypothesesRejected", label: "반증된 가설", kind: "stringList", emoji: "❌", blankRows: 3 },
      { field: "openQuestions", label: "추가 검증 필요", kind: "stringList", emoji: "❓", blankRows: 3 },
      { field: "quotes", label: "직접 인용", kind: "stringList", emoji: "❝", blankRows: 3 },
    ],
  },
  RETRO: {
    key: "RETRO",
    label: "스프린트 회고 (KPT)",
    emoji: "🔄",
    description: "Keep — 유지 · Problem — 문제 · Try — 시도",
    sections: [
      { field: "keep", label: "Keep — 유지", kind: "stringList", blankRows: 4 },
      { field: "problem", label: "Problem — 문제", kind: "stringList", blankRows: 4 },
      { field: "try", label: "Try — 시도", kind: "stringList", blankRows: 4 },
    ],
  },
};

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
}

/** 헤더 영역 — 제목 + 날짜 + 참석자/장소 빈 칸 */
function headerBlocks(title: string, dateText: string, withMetaForm: boolean): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: dateText, color: "666666", size: 22 })],
    }),
  ];
  if (withMetaForm) {
    out.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: "참석자: ", bold: true }),
          new TextRun({ text: "______________________________________________________________" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "일시 / 장소: ", bold: true }),
          new TextRun({ text: "____________________________________________________" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: "안건: ", bold: true }),
          new TextRun({ text: "__________________________________________________________" }),
        ],
      }),
    );
  }
  return out;
}

/** 섹션 헤더 */
function sectionHeading(label: string, emoji?: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: {
      bottom: { color: "AAAAAA", size: 6, style: BorderStyle.SINGLE, space: 1 },
    },
    children: [
      new TextRun({
        text: `${emoji ? `${emoji} ` : ""}${label}`,
        bold: true,
        size: 26,
      }),
    ],
  });
}

/** 단순 글머리 기호 줄 */
function bulletLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: "• ", bold: true }),
      new TextRun({ text }),
    ],
  });
}

/** 빈 줄 (밑줄형) */
function blankLine(): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: "• ", bold: true }),
      new TextRun({ text: "______________________________________________________________" }),
    ],
  });
}

/** 액션 테이블 (담당자 | 내용) */
function actionTable(rows: Array<{ owner: string; content: string }>, blankRows: number): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      tableCell("담당자", { bold: true, shade: "EEEEEE", width: 25 }),
      tableCell("내용", { bold: true, shade: "EEEEEE", width: 75 }),
    ],
  });
  const dataRows: TableRow[] = rows.length > 0
    ? rows.map(
        (r) =>
          new TableRow({
            children: [
              tableCell(r.owner || "—", { width: 25 }),
              tableCell(r.content || "", { width: 75 }),
            ],
          }),
      )
    : Array.from({ length: blankRows }).map(
        () =>
          new TableRow({
            children: [
              tableCell(" ", { width: 25 }),
              tableCell(" ", { width: 75 }),
            ],
          }),
      );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

/** Q&A 테이블 */
function qaTable(rows: Array<{ question: string; answer: string }>, blankRows: number): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      tableCell("Q", { bold: true, shade: "EEEEEE", width: 50 }),
      tableCell("A", { bold: true, shade: "EEEEEE", width: 50 }),
    ],
  });
  const dataRows: TableRow[] = rows.length > 0
    ? rows.map(
        (r) =>
          new TableRow({
            children: [
              tableCell(r.question, { width: 50 }),
              tableCell(r.answer || " ", { width: 50 }),
            ],
          }),
      )
    : Array.from({ length: blankRows }).map(
        () =>
          new TableRow({
            children: [
              tableCell(" ", { width: 50 }),
              tableCell(" ", { width: 50 }),
            ],
          }),
      );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

function tableCell(
  text: string,
  opts: { bold?: boolean; shade?: string; width?: number } = {},
): TableCell {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade
      ? { type: ShadingType.SOLID, color: opts.shade, fill: opts.shade }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold })],
      }),
    ],
  });
}

/** 섹션 한 개 → 블록(들) */
function sectionBlocks(
  section: DocxSection,
  summary: Record<string, unknown> | null,
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [sectionHeading(section.label, section.emoji)];
  const value = summary?.[section.field];
  const blankRows = section.blankRows ?? 4;

  if (section.kind === "stringList") {
    const items = Array.isArray(value)
      ? (value as unknown[]).filter((x) => typeof x === "string" && x.trim()).map(String)
      : [];
    if (items.length > 0) {
      items.forEach((s) => out.push(bulletLine(s)));
    } else {
      for (let i = 0; i < blankRows; i++) out.push(blankLine());
    }
    return out;
  }

  if (section.kind === "actionList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter(
            (v): v is { owner?: string; content?: string } =>
              typeof v === "object" && v !== null,
          )
          .map((v) => ({
            owner: typeof v.owner === "string" ? v.owner : "",
            content: typeof v.content === "string" ? v.content : "",
          }))
          .filter((v) => v.content)
      : [];
    out.push(actionTable(items, blankRows));
    return out;
  }

  if (section.kind === "qaList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter(
            (v): v is { question?: string; answer?: string } =>
              typeof v === "object" && v !== null,
          )
          .map((v) => ({
            question: typeof v.question === "string" ? v.question : "",
            answer: typeof v.answer === "string" ? v.answer : "",
          }))
          .filter((v) => v.question || v.answer)
      : [];
    out.push(qaTable(items, blankRows));
    return out;
  }

  return out;
}

/* ─────────────── 디자인 B: minimal — 라인 + 인라인 리스트 ─────────────── */

function minimalSectionBlocks(
  section: DocxSection,
  summary: Record<string, unknown> | null,
): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 320, after: 100 },
      children: [
        new TextRun({
          text: section.label.toUpperCase(),
          bold: true,
          size: 20,
          color: "111111",
          characterSpacing: 8,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      border: {
        bottom: { color: "111111", size: 12, style: BorderStyle.SINGLE, space: 1 },
      },
      children: [new TextRun({ text: "" })],
    }),
  ];
  const value = summary?.[section.field];
  const blankRows = section.blankRows ?? 4;

  if (section.kind === "stringList") {
    const items = Array.isArray(value)
      ? (value as unknown[]).filter((x) => typeof x === "string" && x.trim()).map(String)
      : [];
    if (items.length === 0) {
      for (let i = 0; i < blankRows; i++) {
        out.push(
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({ text: "—  ", color: "999999" }),
              new TextRun({ text: "______________________________________________________", color: "CCCCCC" }),
            ],
          }),
        );
      }
    } else {
      items.forEach((s) =>
        out.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "—  ", bold: true }),
              new TextRun({ text: s }),
            ],
          }),
        ),
      );
    }
  } else if (section.kind === "actionList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter((v): v is { owner?: string; content?: string } => typeof v === "object" && v !== null)
          .map((v) => ({
            owner: typeof v.owner === "string" ? v.owner : "",
            content: typeof v.content === "string" ? v.content : "",
          }))
          .filter((v) => v.content)
      : [];
    if (items.length === 0) {
      for (let i = 0; i < blankRows; i++) {
        out.push(
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({ text: "—  ", color: "999999" }),
              new TextRun({ text: "[", color: "AAAAAA" }),
              new TextRun({ text: "_______", color: "CCCCCC" }),
              new TextRun({ text: "]  ", color: "AAAAAA" }),
              new TextRun({ text: "______________________________________________", color: "CCCCCC" }),
            ],
          }),
        );
      }
    } else {
      items.forEach((a) =>
        out.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "—  ", bold: true }),
              ...(a.owner
                ? [new TextRun({ text: `[${a.owner}] `, bold: true, color: "555555" })]
                : []),
              new TextRun({ text: a.content }),
            ],
          }),
        ),
      );
    }
  } else if (section.kind === "qaList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter((v): v is { question?: string; answer?: string } => typeof v === "object" && v !== null)
          .map((v) => ({
            question: typeof v.question === "string" ? v.question : "",
            answer: typeof v.answer === "string" ? v.answer : "",
          }))
          .filter((v) => v.question || v.answer)
      : [];
    if (items.length === 0) {
      for (let i = 0; i < blankRows; i++) {
        out.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Q. ", bold: true }),
              new TextRun({ text: "______________________________________________", color: "CCCCCC" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "A. ", bold: true, color: "555555" }),
              new TextRun({ text: "______________________________________________", color: "CCCCCC" }),
            ],
          }),
        );
      }
    } else {
      items.forEach((q) => {
        out.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Q. ", bold: true }),
              new TextRun({ text: q.question }),
            ],
          }),
        );
        if (q.answer)
          out.push(
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({ text: "A. ", bold: true, color: "555555" }),
                new TextRun({ text: q.answer }),
              ],
            }),
          );
      });
    }
  }
  return out;
}

/* ─────────────── 디자인 C: business — 모든 섹션을 표로 ─────────────── */

function businessSectionBlocks(
  section: DocxSection,
  summary: Record<string, unknown> | null,
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 320, after: 80 },
      children: [
        new TextRun({
          text: `■ ${section.label}`,
          bold: true,
          size: 22,
          color: "1F2937",
        }),
      ],
    }),
  ];
  const value = summary?.[section.field];
  const blankRows = section.blankRows ?? 4;

  if (section.kind === "actionList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter((v): v is { owner?: string; content?: string } => typeof v === "object" && v !== null)
          .map((v) => ({
            owner: typeof v.owner === "string" ? v.owner : "",
            content: typeof v.content === "string" ? v.content : "",
          }))
          .filter((v) => v.content)
      : [];
    out.push(
      buildTable(
        [
          { text: "No.", width: 10 },
          { text: "담당자", width: 20 },
          { text: "내용", width: 60 },
          { text: "기한", width: 10 },
        ],
        items.length > 0
          ? items.map((r, i) => [String(i + 1), r.owner || "—", r.content, " "])
          : Array.from({ length: blankRows }).map((_, i) => [String(i + 1), " ", " ", " "]),
        "DBEAFE",
      ),
    );
    return out;
  }

  if (section.kind === "qaList") {
    const items = Array.isArray(value)
      ? (value as unknown[])
          .filter((v): v is { question?: string; answer?: string } => typeof v === "object" && v !== null)
          .map((v) => ({
            question: typeof v.question === "string" ? v.question : "",
            answer: typeof v.answer === "string" ? v.answer : "",
          }))
          .filter((v) => v.question || v.answer)
      : [];
    out.push(
      buildTable(
        [
          { text: "Question", width: 50 },
          { text: "Answer", width: 50 },
        ],
        items.length > 0
          ? items.map((r) => [r.question, r.answer || " "])
          : Array.from({ length: blankRows }).map(() => [" ", " "]),
        "DBEAFE",
      ),
    );
    return out;
  }

  // stringList → No. + 항목 표
  const items = Array.isArray(value)
    ? (value as unknown[]).filter((x) => typeof x === "string" && x.trim()).map(String)
    : [];
  out.push(
    buildTable(
      [
        { text: "No.", width: 10 },
        { text: "내용", width: 90 },
      ],
      items.length > 0
        ? items.map((s, i) => [String(i + 1), s])
        : Array.from({ length: blankRows }).map((_, i) => [String(i + 1), " "]),
      "DBEAFE",
    ),
  );
  return out;
}

function buildTable(
  columns: Array<{ text: string; width: number }>,
  rows: string[][],
  headerShade: string,
): Table {
  const header = new TableRow({
    tableHeader: true,
    children: columns.map((c) => tableCell(c.text, { bold: true, shade: headerShade, width: c.width })),
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((cell, idx) =>
          tableCell(cell, { width: columns[idx]?.width }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

/* ─────────────── 메인 빌더 ─────────────── */

export type MeetingDocxDesign = "classic" | "minimal" | "business";

export const DOCX_DESIGNS: Array<{
  key: MeetingDocxDesign;
  label: string;
  description: string;
  emoji: string;
}> = [
  { key: "classic", label: "클래식", description: "헤딩 + 글머리표 + 표 — 기본형", emoji: "📝" },
  { key: "minimal", label: "미니멀", description: "라인 중심 — 깔끔한 인쇄용", emoji: "✒️" },
  { key: "business", label: "비즈니스", description: "전 섹션 표 형식 — 결재 문서풍", emoji: "📊" },
];

/**
 * 회의록 .docx 생성.
 * @param templateKey 5종 중 하나
 * @param design 3종 디자인 (기본 classic)
 * @param title 문서 제목
 * @param summary AI 또는 사용자 입력 summary JSON. null/undefined → 빈 양식 모드
 * @param dateText 날짜 (기본: 오늘)
 */
export async function buildMeetingDocx(opts: {
  templateKey: MeetingTemplateKey;
  design?: MeetingDocxDesign;
  title?: string;
  summary?: Record<string, unknown> | null;
  dateText?: string;
}): Promise<Buffer> {
  const tpl = DOCX_TEMPLATES[opts.templateKey] ?? DOCX_TEMPLATES.DEFAULT;
  const design: MeetingDocxDesign = opts.design ?? "classic";
  const isBlank = !opts.summary;
  const docTitle = opts.title?.trim() || `${tpl.label} 회의록`;

  const blocks: Array<Paragraph | Table> = [
    ...headerBlocks(docTitle, opts.dateText ?? todayKo(), isBlank),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${tpl.emoji} ${tpl.description}`,
          color: "666666",
          italics: true,
        }),
      ],
    }),
  ];

  for (const section of tpl.sections) {
    if (design === "minimal") {
      blocks.push(...minimalSectionBlocks(section, opts.summary ?? null));
    } else if (design === "business") {
      blocks.push(...businessSectionBlocks(section, opts.summary ?? null));
    } else {
      blocks.push(...sectionBlocks(section, opts.summary ?? null));
    }
  }

  // 푸터
  blocks.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `— Widea로 정리한 회의록 · ${design}`,
          color: "999999",
          size: 18,
          italics: true,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "Widea",
    title: docTitle,
    sections: [{ properties: {}, children: blocks }],
  });

  return Packer.toBuffer(doc);
}

/** 안전한 ASCII filename (Content-Disposition fallback) */
export function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/[\\/:*?"<>|]/g, "_");
}
