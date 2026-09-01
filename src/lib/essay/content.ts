/**
 * 申论内容包（F0344–F0347）：题干/任务/字数/材料/Rubric/得分点/范例是一个整体快照。
 * 只有发布后的快照参与批改，历史版本不可变，便于前后对比与追责。
 */
import { isValidEssayRubric } from "./grade";
import { ESSAY_SEED } from "./bank";
import type { EssayQuestion, EssayType, ScorePoint } from "./types";

export interface EssayContentExample {
  id: string;
  kind: "结构范例" | "高分范例";
  title: string;
  content: string;
}

export interface EssayContentBundle {
  schemaVersion: 1;
  question: EssayQuestion;
  /** 仅后台可见的参考答案与解析（F0344 对比对象） */
  referenceAnswer: string;
  analysis: string;
  examples: EssayContentExample[];
}

export type EssayRevisionStatus = "draft" | "published" | "archived";

export interface EssayRevisionMeta {
  questionId: string;
  revision: number;
  status: EssayRevisionStatus;
  changeReason: string;
  ticketRef: string | null;
  supersedesRevision: number | null;
  createdBy: string;
  createdAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
}

const ESSAY_TYPES: EssayType[] = ["概括", "对策", "公文", "大作文"];

function validScorePoints(value: unknown): value is ScorePoint[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const ids = new Set<string>();
  for (const item of value) {
    const point = item as Partial<ScorePoint>;
    if (typeof point?.id !== "string" || point.id.trim() === "" || ids.has(point.id)) return false;
    ids.add(point.id);
    if (typeof point.label !== "string" || point.label.trim() === "") return false;
    if (!Number.isFinite(point.points) || (point.points ?? 0) <= 0) return false;
    if (typeof point.materialQuote !== "string" || point.materialQuote.trim() === "") return false;
    if (!Array.isArray(point.keywords) || point.keywords.length === 0) return false;
    for (const group of point.keywords) {
      if (!Array.isArray(group) || group.length === 0) return false;
      if (!group.every((keyword) => typeof keyword === "string" && keyword.trim() !== "")) return false;
    }
  }
  return true;
}

export function validateEssayBundle(value: unknown): { ok: true; bundle: EssayContentBundle } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  const raw = value as Partial<EssayContentBundle> | null;
  if (!raw || typeof raw !== "object") return { ok: false, issues: ["内容包必须是对象。"] };
  if (raw.schemaVersion !== 1) issues.push("schemaVersion 必须为 1。");

  const question = raw.question as Partial<EssayQuestion> | undefined;
  if (!question || typeof question !== "object") {
    issues.push("缺少 question。");
  } else {
    if (typeof question.id !== "string" || question.id.trim() === "") issues.push("question.id 必填。");
    if (!question.type || !ESSAY_TYPES.includes(question.type)) issues.push(`question.type 必须是 ${ESSAY_TYPES.join("/")}。`);
    if (typeof question.title !== "string" || question.title.trim() === "") issues.push("question.title 必填。");
    if (typeof question.task !== "string" || question.task.trim() === "") issues.push("question.task 必填。");
    if (!Number.isFinite(question.wordLimit) || (question.wordLimit ?? 0) <= 0) issues.push("question.wordLimit 必须为正整数。");
    if (!Number.isFinite(question.year)) issues.push("question.year 必填。");
    if (typeof question.region !== "string" || question.region.trim() === "") issues.push("question.region 必填。");
    if (typeof question.exam !== "string" || question.exam.trim() === "") issues.push("question.exam 必填。");
    const materials = question.materials;
    const materialsOk = Array.isArray(materials) && materials.length > 0 && materials.every((material) =>
      typeof material?.title === "string" && material.title.trim() !== "" &&
      Array.isArray(material.paragraphs) && material.paragraphs.length > 0 &&
      material.paragraphs.every((paragraph) => typeof paragraph === "string" && paragraph.trim() !== ""),
    );
    if (!materialsOk) issues.push("question.materials 至少需要一段非空材料。");
    if (!isValidEssayRubric(question.rubric)) issues.push("question.rubric 不完整（四维权重需合计为 1）。");
    if (!validScorePoints(question.scorePoints)) issues.push("question.scorePoints 需为非空、唯一、带材料依据的采点表。");
  }

  if (typeof raw.referenceAnswer !== "string" || raw.referenceAnswer.trim() === "") issues.push("referenceAnswer 必填。");
  if (typeof raw.analysis !== "string" || raw.analysis.trim() === "") issues.push("analysis 必填。");
  const examplesOk = Array.isArray(raw.examples) && raw.examples.length > 0 && raw.examples.every((example) =>
    typeof example?.id === "string" && example.id.trim() !== "" &&
    (example.kind === "结构范例" || example.kind === "高分范例") &&
    typeof example.title === "string" && example.title.trim() !== "" &&
    typeof example.content === "string" && example.content.trim() !== "",
  );
  if (!examplesOk) issues.push("examples 至少需要一条结构或高分范例（F0347）。");

  return issues.length === 0 ? { ok: true, bundle: raw as EssayContentBundle } : { ok: false, issues };
}

/** 种子内容包：首次部署时作为已发布 revision 1，保证线上有可用内容。 */
export function seedBundles(): EssayContentBundle[] {
  return ESSAY_SEED.map((question) => ({
    schemaVersion: 1 as const,
    question,
    referenceAnswer: question.scorePoints.map((point, index) => `${index + 1}. ${point.label}`).join("；") + "。",
    analysis: `本题按 ${question.scorePoints.length} 个采点评分，结构分依据「${question.rubric.structureSignals.slice(0, 3).join("/")}」等信号词判定。`,
    examples: [
      {
        id: `${question.id}-outline`,
        kind: "结构范例",
        title: "结构提纲（不替写）",
        content: question.rubric.exampleOutline.join("\n"),
      },
      {
        id: `${question.id}-model`,
        kind: "高分范例",
        title: "高分作答要点",
        content: question.scorePoints.map((point) => `${point.label}：${point.materialQuote}`).join("\n"),
      },
    ],
  }));
}

/** 前后对比（F0344）：只比较运营真正关心的字段，避免整段 JSON diff 噪音。 */
export interface BundleFieldDiff {
  field: string;
  changed: boolean;
  before: string;
  after: string;
}

export function diffBundles(before: EssayContentBundle, after: EssayContentBundle): BundleFieldDiff[] {
  const asText = (bundle: EssayContentBundle): Record<string, string> => ({
    题干: bundle.question.title,
    任务: bundle.question.task,
    字数上限: String(bundle.question.wordLimit),
    材料: bundle.question.materials.map((material) => `${material.title}\n${material.paragraphs.join("\n")}`).join("\n---\n"),
    Rubric: JSON.stringify(bundle.question.rubric),
    得分点: bundle.question.scorePoints.map((point) => `${point.id}｜${point.label}｜${point.points}`).join("\n"),
    参考答案: bundle.referenceAnswer,
    解析: bundle.analysis,
    范例: bundle.examples.map((example) => `${example.kind}｜${example.title}`).join("\n"),
  });
  const left = asText(before);
  const right = asText(after);
  return Object.keys(left).map((field) => ({
    field,
    changed: left[field] !== right[field],
    before: left[field] ?? "",
    after: right[field] ?? "",
  }));
}
