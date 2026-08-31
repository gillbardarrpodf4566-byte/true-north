/**
 * 申论评分引擎（V1 / CL-05 step2）。
 *
 * 设计约束（xlsx 规则原文）：
 * - 「评测与训练分离；主观评分明确参考性质与置信度」→ 输出必带置信等级与限制说明
 * - 「每个关键反馈指向原答案/材料片段」→ 采点命中带用户原句，漏点带材料依据
 * - 「只给最值得优先修改的1-3项」→ topFixes ≤ 3
 * - 确定性优先：采点/结构信号/口语词均为程序断言，模型输出视为不可信
 */
import type {
  EssayGrade,
  EssayQuestion,
  HitPoint,
  MissedPoint,
} from "./types";

export function splitSentences(text: string): Array<{ text: string; index: number }> {
  return text
    .split(/[。！？;；\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t, index) => ({ text: t, index }));
}

/** 中文字数（去空白后字符数，F0203 实时字数同口径） */
export function countWords(text: string): number {
  return text.replace(/\s/g, "").length;
}

function sentenceHitsAll(sentence: string, keywords: string[]): boolean {
  return keywords.every((k) => sentence.includes(k));
}

export function gradeEssay(submission: { id: string; text: string }, q: EssayQuestion): EssayGrade {
  const sentences = splitSentences(submission.text);
  const wordCount = countWords(submission.text);
  const rubric = q.rubric;

  // ---------- 采点（F0206/F0207） ----------
  const hits: HitPoint[] = [];
  const misses: MissedPoint[] = [];
  for (const point of q.scorePoints) {
    let hit: HitPoint | null = null;
    for (const s of sentences) {
      for (const group of point.keywords) {
        if (sentenceHitsAll(s.text, group)) {
          hit = {
            pointId: point.id,
            label: point.label,
            points: point.points,
            userSentence: s.text,
            sentenceIndex: s.index,
          };
          break;
        }
      }
      if (hit) break;
    }
    if (hit) hits.push(hit);
    else
      misses.push({
        pointId: point.id,
        label: point.label,
        points: point.points,
        materialQuote: point.materialQuote,
      });
  }
  const totalPoints = q.scorePoints.reduce((s2, p) => s2 + p.points, 0);
  const hitPoints = hits.reduce((s2, h) => s2 + h.points, 0);
  const hitRate = totalPoints === 0 ? 0 : hitPoints / totalPoints;

  const dimFull = (id: "内容" | "结构" | "语言" | "规范"): number => {
    const w = rubric.dimensions.find((d) => d.id === id)?.weight ?? 0;
    return round1(rubric.fullScore * w);
  };

  // ---------- 维度：内容 ----------
  const contentScore = round1(dimFull("内容") * hitRate);

  // ---------- 维度：结构（F0209） ----------
  const structureIssues: string[] = [];
  const uniqueSignals = rubric.structureSignals.filter((sig) => submission.text.includes(sig));
  const paragraphs = submission.text.split(/\n+/).filter((p) => p.trim().length > 0).length;
  let structureRatio = Math.min(1, (uniqueSignals.length / 3) * 0.6);
  if (paragraphs >= 2) structureRatio += 0.4;
  else structureRatio += 0.15;
  if (uniqueSignals.length === 0) {
    structureIssues.push("缺少分层标记（如「一是…二是…」），阅卷人难以快速定位要点。");
  }
  if (paragraphs < 2 && q.type !== "概括") {
    structureIssues.push("全文未分段，建议按「总起—分述—总结」组织。");
  }
  if (q.type === "大作文" && !/(综上所述|因此|总之|由此可见)/.test(submission.text)) {
    structureIssues.push("缺少总结句，结尾未回扣中心论点。");
  }
  const structureScore = round1(dimFull("结构") * Math.min(1, structureRatio));

  // ---------- 维度：语言 ----------
  const longSentences = sentences.filter((s) => s.text.length > 80).length;
  let langRatio = 1 - Math.min(0.45, longSentences * 0.15);
  if (sentences.length > 0 && sentences.every((s) => s.text.length < 8)) {
    langRatio -= 0.2;
  }
  const langScore = round1(dimFull("语言") * Math.max(0.3, langRatio));

  // ---------- 维度：规范（F0203/F0210） ----------
  const normSuggestions: Array<{ bad: string; good: string }> = [];
  for (const w of rubric.informalWords) {
    if (submission.text.includes(w.bad)) normSuggestions.push({ bad: w.bad, good: w.good });
  }
  const inRange = wordCount >= q.wordLimit * 0.75 && wordCount <= q.wordLimit * 1.1;
  let normRatio = 1 - Math.min(0.5, normSuggestions.length * 0.12);
  if (!inRange) normRatio -= 0.25;
  const normScore = round1(Math.max(0, dimFull("规范") * normRatio));

  const score = round1(
    Math.min(rubric.fullScore, contentScore + structureScore + langScore + normScore),
  );

  // ---------- 冗余（F0208）：重复句 ----------
  const redundancies: Array<{ sentence: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const key = s.text.slice(0, 16);
    if (seen.has(key)) {
      redundancies.push({ sentence: s.text, reason: "与前文表达重复，属于无效信息。" });
    }
    seen.add(key);
  }

  // ---------- 置信度（F0212） ----------
  let confidence: EssayGrade["confidence"];
  let confidenceNote: string;
  if (wordCount < q.wordLimit * 0.4 || hits.length <= 1) {
    confidence = "低";
    confidenceNote =
      "答案篇幅不足或可采点过少，本次参考分不稳定，请以修改建议为主、分数为辅。";
  } else if (hitRate < 0.6 || !inRange) {
    confidence = "中";
    confidenceNote =
      "采点或字数与要求有明显偏差，参考分仅供定位问题使用；重写后对比更有意义。";
  } else {
    confidence = "高";
    confidenceNote =
      "本次参考分基于明确的得分点采点与结构信号，可作为阶段性参考；主观题最终以阅卷标准为准。";
  }

  // ---------- 优先改三点（F0213） ----------
  const fixes: Array<{ title: string; action: string; lostPoints: number }> = [];
  if (misses.length > 0) {
    const top = [...misses].sort((a, b) => b.points - a.points)[0]!;
    fixes.push({
      title: `漏答高分要点：${top.label}`,
      action: `回材料定位这句依据并补进答案：「${top.materialQuote.slice(0, 40)}…」`,
      lostPoints: top.points,
    });
  }
  if (!inRange) {
    fixes.push({
      title: wordCount > q.wordLimit * 1.1 ? "字数超出限制" : "字数明显不足",
      action: `按「${q.wordLimit} 字」要求增删：删冗余句、补漏点。当前 ${wordCount} 字。`,
      lostPoints: 15,
    });
  }
  for (const issue of structureIssues) {
    fixes.push({ title: "结构问题", action: issue, lostPoints: 10 });
    break;
  }
  if (redundancies.length > 0) {
    fixes.push({
      title: "存在重复表达",
      action: "删除或改写重复句，把字数让给未覆盖的要点。",
      lostPoints: 8,
    });
  }
  if (normSuggestions.length > 0) {
    fixes.push({
      title: "表达欠规范",
      action: `替换口语化表述：${normSuggestions
        .slice(0, 3)
        .map((n) => `「${n.bad}」→「${n.good}」`)
        .join("、")}。`,
      lostPoints: 5,
    });
  }
  const topFixes = fixes.sort((a, b) => b.lostPoints - a.lostPoints).slice(0, 3);

  return {
    submissionId: submission.id,
    score,
    dimensions: [
      { id: "内容", score: contentScore, full: dimFull("内容") },
      { id: "结构", score: structureScore, full: dimFull("结构") },
      { id: "语言", score: langScore, full: dimFull("语言") },
      { id: "规范", score: normScore, full: dimFull("规范") },
    ],
    hits,
    misses,
    redundancies,
    structureIssues,
    normSuggestions,
    wordCount,
    wordLimit: q.wordLimit,
    confidence,
    confidenceNote,
    topFixes,
    gradedAt: new Date().toISOString(),
  };
}

/** 范例对照（F0215：给结构范例，不替写） */
export function exampleOutlineFor(q: EssayQuestion): string[] {
  return q.rubric.exampleOutline;
}

/** 专项弱项推荐（F0200）：历史维度最低项 */
export function weakestDimension(
  history: Array<EssayGrade>,
): { id: "内容" | "结构" | "语言" | "规范"; ratio: number } | null {
  if (history.length === 0) return null;
  const sums: Record<string, { score: number; full: number }> = {};
  for (const g of history) {
    for (const d of g.dimensions) {
      const cell = (sums[d.id] ??= { score: 0, full: 0 });
      cell.score += d.score;
      cell.full += d.full;
    }
  }
  const ratios = Object.entries(sums).map(([id, v]) => ({
    id: id as "内容" | "结构" | "语言" | "规范",
    ratio: v.full === 0 ? 0 : v.score / v.full,
  }));
  ratios.sort((a, b) => a.ratio - b.ratio);
  return ratios[0] ?? null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
