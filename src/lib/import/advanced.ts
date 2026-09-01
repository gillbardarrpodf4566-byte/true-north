/** V1 外部数据接入（F0039/F0042/F0043/F0044/F0048/F0049）。 */
import type { ScoreImport } from "@/lib/profile/store";
import { MODULES, type ModuleId } from "@/lib/profile/types";
import type { ErrorCause } from "@/lib/questions/types";

export interface ImportIssue {
  row: number;
  field: string;
  message: string;
}

export interface ExternalPracticeRecord {
  date: string;
  moduleId: ModuleId;
  questionType: string;
  questions: number;
  correct: number;
  totalSeconds: number | null;
  source: string;
  rawEvidence: string;
}

export interface ExternalWrongRecord {
  date: string;
  moduleId: ModuleId;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  suggestedCause: ErrorCause | null;
  source: string;
  rawEvidence: string;
}

export function parseHistoryJson(
  text: string,
  source = "外部批量导入",
): { records: ScoreImport[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { records: [], issues: [{ row: 0, field: "JSON", message: "无法解析 JSON" }] };
  }
  if (!Array.isArray(raw)) return { records: [], issues: [{ row: 0, field: "root", message: "根节点必须是数组" }] };
  const records: ScoreImport[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      issues.push({ row: i + 1, field: "row", message: "必须是对象" });
      return;
    }
    const r = item as Record<string, unknown>;
    const date = String(r.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) issues.push({ row: i + 1, field: "date", message: "日期必须为 YYYY-MM-DD" });
    const mods = Array.isArray(r.modules) ? r.modules : [];
    if (mods.length === 0) issues.push({ row: i + 1, field: "modules", message: "至少包含一个模块" });
    const parsed = mods.map((m, j) => {
      const x = (m ?? {}) as Record<string, unknown>;
      const id = String(x.id ?? "") as ModuleId;
      if (!MODULES.includes(id)) issues.push({ row: i + 1, field: `modules[${j}].id`, message: `未知模块 ${id}` });
      const score = numberOrNull(x.score);
      const questions = numberOrNull(x.questions);
      const correct = numberOrNull(x.correct);
      if (correct != null && questions != null && correct > questions) issues.push({ row: i + 1, field: `modules[${j}]`, message: "正确数不能大于题数" });
      return { id, score, questions, correct, secondsPerQuestion: numberOrNull(x.secondsPerQuestion) };
    });
    records.push({
      id: `hist-${stableDigest({ source, date, examLabel: String(r.examLabel ?? "外部历史模考"), totalScore: numberOrNull(r.totalScore), modules: parsed })}`,
      source: "截图" as const,
      platform: source,
      examLabel: String(r.examLabel ?? "外部历史模考"),
      importedAt: date || new Date().toISOString(),
      totalScore: numberOrNull(r.totalScore),
      modules: parsed,
      sourceRef: { kind: "external", rawEvidence: JSON.stringify(r) },
    });
  });
  return { records, issues };
}

export function parsePracticeJson(text: string, source = "外部练习记录"): { records: ExternalPracticeRecord[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { records: [], issues: [{ row: 0, field: "JSON", message: "无法解析 JSON" }] }; }
  if (!Array.isArray(raw)) return { records: [], issues: [{ row: 0, field: "root", message: "根节点必须是数组" }] };
  const records: ExternalPracticeRecord[] = [];
  raw.forEach((item, i) => {
    const r = (item ?? {}) as Record<string, unknown>;
    const moduleId = String(r.moduleId ?? "") as ModuleId;
    if (!MODULES.includes(moduleId)) issues.push({ row: i + 1, field: "moduleId", message: "未知模块" });
    const questions = Number(r.questions);
    const correct = Number(r.correct);
    if (!Number.isInteger(questions) || questions <= 0) issues.push({ row: i + 1, field: "questions", message: "题数必须为正整数" });
    if (!Number.isInteger(correct) || correct < 0 || correct > questions) issues.push({ row: i + 1, field: "correct", message: "正确数不合法" });
    records.push({
      date: String(r.date ?? new Date().toISOString().slice(0, 10)),
      moduleId,
      questionType: String(r.questionType ?? "未标注题型"),
      questions: Number.isFinite(questions) ? questions : 0,
      correct: Number.isFinite(correct) ? correct : 0,
      totalSeconds: numberOrNull(r.totalSeconds),
      source,
      rawEvidence: JSON.stringify(r),
    });
  });
  return { records, issues };
}

export function parseWrongJson(text: string, source = "外部错题导入"): { records: ExternalWrongRecord[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { records: [], issues: [{ row: 0, field: "JSON", message: "无法解析 JSON" }] }; }
  if (!Array.isArray(raw)) return { records: [], issues: [{ row: 0, field: "root", message: "根节点必须是数组" }] };
  const records: ExternalWrongRecord[] = [];
  raw.forEach((item, i) => {
    const r = (item ?? {}) as Record<string, unknown>;
    const moduleId = String(r.moduleId ?? "") as ModuleId;
    const questionText = String(r.questionText ?? "").trim();
    if (!MODULES.includes(moduleId)) issues.push({ row: i + 1, field: "moduleId", message: "未知模块" });
    if (questionText.length < 5) issues.push({ row: i + 1, field: "questionText", message: "题干过短" });
    records.push({
      date: String(r.date ?? new Date().toISOString().slice(0, 10)),
      moduleId,
      questionText,
      userAnswer: String(r.userAnswer ?? ""),
      correctAnswer: String(r.correctAnswer ?? ""),
      suggestedCause: null,
      source,
      rawEvidence: JSON.stringify(r),
    });
  });
  return { records, issues };
}

/** F0044：从记录中计算总用时和题型平均用时，确定性问题不交给模型。 */
export function extractTiming(records: ExternalPracticeRecord[]): { totalSeconds: number; perType: Record<string, number> } {
  const perType: Record<string, { seconds: number; questions: number }> = {};
  for (const r of records) {
    if (r.totalSeconds == null) continue;
    const e = (perType[r.questionType] ??= { seconds: 0, questions: 0 });
    e.seconds += r.totalSeconds;
    e.questions += r.questions;
  }
  return {
    totalSeconds: records.reduce((s, r) => s + (r.totalSeconds ?? 0), 0),
    perType: Object.fromEntries(Object.entries(perType).map(([k, v]) => [k, Math.round((v.seconds / Math.max(v.questions, 1)) * 10) / 10])),
  };
}

/** 语义指纹：键排序、去除空白/时间戳，保证相同数据重复提交得到同一 ID。 */
export function stableDigest(value: unknown): string {
  const canonical = JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item;
  });
  let hash = 2166136261;
  for (const char of canonical) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function practiceFingerprint(record: Pick<ExternalPracticeRecord, "date" | "moduleId" | "questionType" | "questions" | "correct" | "totalSeconds">, source: string): string {
  return stableDigest({ kind: "practice", source, ...record });
}

export function wrongFingerprint(record: Pick<ExternalWrongRecord, "date" | "moduleId" | "questionText" | "userAnswer" | "correctAnswer">, source: string): string {
  return stableDigest({ kind: "wrong", source, ...record });
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
