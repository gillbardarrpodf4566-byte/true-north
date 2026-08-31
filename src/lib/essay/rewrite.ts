/**
 * 申论重写闭环与报告（CL-05 step4–5 / F0216–F0226）。
 */
import type { EssayAbility, EssayGrade, EssayQuestion, EssaySubmission } from "./types";

/** 前后对比（F0217）：高亮改善点 */
export function compareRewrite(
  first: EssayGrade,
  second: EssayGrade,
): {
  scoreDelta: number;
  newHits: string[];
  resolvedMisses: string[];
  dimensionDeltas: Array<{ id: string; delta: number }>;
  summary: string;
} {
  const firstHit = new Set(first.hits.map((h) => h.pointId));
  const secondHit = new Set(second.hits.map((h) => h.pointId));
  const newHits = second.hits.filter((h) => !firstHit.has(h.pointId)).map((h) => h.label);
  const resolvedMisses = first.misses.filter((m) => secondHit.has(m.pointId)).map((m) => m.label);
  const dimensionDeltas = second.dimensions.map((d) => {
    const prev = first.dimensions.find((x) => x.id === d.id)!;
    return { id: d.id, delta: Math.round(((d.score - prev.score) / Math.max(prev.full, 1)) * 100) };
  });
  const scoreDelta = Math.round((second.score - first.score) * 10) / 10;
  const parts: string[] = [];
  if (newHits.length > 0) parts.push(`新采到要点：${newHits.join("、")}`);
  if (resolvedMisses.length > 0 && newHits.length === 0)
    parts.push(`补上了此前遗漏的：${resolvedMisses.join("、")}`);
  if (scoreDelta !== 0)
    parts.push(`参考分${scoreDelta > 0 ? "提高" : "回落"} ${Math.abs(scoreDelta)} 分`);
  return {
    scoreDelta,
    newHits,
    resolvedMisses,
    dimensionDeltas,
    summary: parts.length > 0 ? parts.join("；") + "。" : "两次作答基本持平，建议对照「优先改三点」再试一次。",
  };
}

/** 能力更新（F0218）：按历次表现滚动更新申论维度画像 */
export function updateEssayAbility(
  prev: EssayAbility | null,
  q: EssayQuestion,
  grade: EssayGrade,
  at = new Date(),
): EssayAbility {
  const dims = grade.dimensions.map((d) => ({
    id: d.id,
    score: d.full === 0 ? 0 : d.score / d.full,
  }));
  if (!prev || prev.type !== q.type) {
    return { type: q.type, dimensions: dims, attempts: 1, lastAt: at.toISOString() };
  }
  const n = prev.attempts;
  const merged = prev.dimensions.map((d) => {
    const cur = dims.find((x) => x.id === d.id)?.score ?? d.score;
    return { id: d.id, score: Math.round(((d.score * n + cur) / (n + 1)) * 1000) / 1000 };
  });
  return { type: q.type, dimensions: merged, attempts: n + 1, lastAt: at.toISOString() };
}

export interface EssayReport {
  /** F0224 各题型/维度趋势 */
  trends: Array<{ label: string; points: Array<{ label: string; value: number }> }>;
  /** F0225 高频问题（topFixes 标题频次） */
  frequentIssues: Array<{ title: string; count: number }>;
  /** F0226 专项处方：下周 1–3 项 */
  nextWeekPlan: Array<{ title: string; minutes: number; successCriteria: string }>;
}

/** 报告（F0224–F0226）：趋势 + 高频问题 + 专项处方 */
export function buildEssayReport(
  submissions: EssaySubmission[],
  grades: Record<string, EssayGrade>,
  questions: Record<string, EssayQuestion>,
): EssayReport {
  const graded = submissions
    .filter((s) => grades[s.id])
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const byType = new Map<string, Array<{ label: string; value: number }>>();
  const dimSeries = new Map<string, Array<{ label: string; value: number }>>();
  const issueCount = new Map<string, number>();

  graded.forEach((s, i) => {
    const g = grades[s.id]!;
    const q = questions[s.questionId];
    const label = `第${i + 1}次`;
    const key = q?.type ?? "未知";
    const arr = byType.get(key) ?? [];
    arr.push({ label, value: g.score });
    byType.set(key, arr);
    for (const d of g.dimensions) {
      const dk = `${key}·${d.id}`;
      const da = dimSeries.get(dk) ?? [];
      da.push({ label, value: d.full === 0 ? 0 : Math.round((d.score / d.full) * 100) });
      dimSeries.set(dk, da);
    }
    for (const f of g.topFixes) {
      issueCount.set(f.title, (issueCount.get(f.title) ?? 0) + 1);
    }
  });

  const trends = [
    ...[...byType.entries()].map(([label, points]) => ({ label: `参考分 · ${label}`, points })),
    ...[...dimSeries.entries()]
      .filter(([, pts]) => pts.length >= 2)
      .map(([label, points]) => ({ label: `维度% · ${label}`, points })),
  ];

  const frequentIssues = [...issueCount.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const nextWeekPlan = frequentIssues.slice(0, 3).map((f, i) => ({
    title: `专项修复：${f.title}`,
    minutes: 25 - i * 5,
    successCriteria: `完成同类练习后，下一次作答不再出现「${f.title}」或同类问题。`,
  }));

  return { trends, frequentIssues, nextWeekPlan };
}
