import type { EducationLevel, PoliticalStatus } from "./types";

export const DEFAULT_MAJOR_SYNONYMS: Record<string, string[]> = {
  计算机类: ["计算机科学与技术", "软件工程", "信息安全", "数据科学与大数据技术"],
  法学类: ["法学", "法律硕士", "知识产权"],
  经济学类: ["经济学", "金融学", "财政学", "国际经济与贸易"],
  中国语言文学类: ["汉语言文学", "新闻学", "网络与新媒体"],
  管理类: ["行政管理", "工商管理", "人力资源管理", "公共事业管理"],
  统计学类: ["统计学", "应用统计学", "数据科学与大数据技术"],
  不限: [],
};

export interface QualificationRuleSet {
  schemaVersion: 1;
  educationOrder: EducationLevel[];
  politicalOrder: PoliticalStatus[];
  grassrootsYearsWhenRequired: number;
  majorSynonyms: Record<string, string[]>;
  synonymVerdict: "待人工确认";
}

export const DEFAULT_RULE_SET: QualificationRuleSet = {
  schemaVersion: 1,
  educationOrder: ["大专", "本科", "硕士", "博士"],
  politicalOrder: ["群众", "共青团员", "中共党员"],
  grassrootsYearsWhenRequired: 2,
  majorSynonyms: DEFAULT_MAJOR_SYNONYMS,
  synonymVerdict: "待人工确认",
};

export function validateRuleSet(value: unknown): { ok: true; rules: QualificationRuleSet } | { ok: false; issues: string[] } {
  const raw = value as Partial<QualificationRuleSet> | null;
  const issues: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, issues: ["规则集必须是对象。"] };
  if (raw.schemaVersion !== 1) issues.push("schemaVersion 必须为 1。");
  if (!Array.isArray(raw.educationOrder) || raw.educationOrder.length !== 4 || new Set(raw.educationOrder).size !== 4) issues.push("educationOrder 必须包含四级学历且不重复。");
  if (!Array.isArray(raw.politicalOrder) || raw.politicalOrder.length !== 3 || new Set(raw.politicalOrder).size !== 3) issues.push("politicalOrder 必须包含三种政治面貌且不重复。");
  if (!Number.isInteger(raw.grassrootsYearsWhenRequired) || (raw.grassrootsYearsWhenRequired ?? 0) < 0 || (raw.grassrootsYearsWhenRequired ?? 0) > 20) issues.push("基层经历年限必须为 0–20 的整数。");
  if (!raw.majorSynonyms || typeof raw.majorSynonyms !== "object" || Array.isArray(raw.majorSynonyms)) issues.push("majorSynonyms 必须是映射对象。");
  else for (const [key, values] of Object.entries(raw.majorSynonyms)) {
    if (!key.trim() || !Array.isArray(values) || !values.every((value) => typeof value === "string" && value.trim() !== "")) issues.push(`专业映射「${key}」格式无效。`);
  }
  if (raw.synonymVerdict !== "待人工确认") issues.push("synonymVerdict 必须为待人工确认。");
  return issues.length > 0 ? { ok: false, issues } : { ok: true, rules: raw as QualificationRuleSet };
}
