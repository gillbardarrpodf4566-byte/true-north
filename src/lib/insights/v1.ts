/**
 * V1 错因聚合（F0158–F0163 / F0279）+ 分数预测（F0192/F0193）+
 * 模考策略（F0195–F0197 / F0181/F0184/F0189）+ 诊断增强（F0090/F0091/
 * F0095/F0098/F0102/F0103）+ 稳定性机会（F0090）。
 */
import type { AbilityDimensions, AttemptRecord } from "@/lib/ability/dimensions";
import type { WrongBookEntry } from "@/lib/errorcause/engine";

// ---------- 错因聚合 ----------

export interface ErrorCauseAggregate {
  /** F0158 错因排行 */
  ranking: Array<{ cause: string; count: number; share: number }>;
  /** F0159 复发率：同错因再次出现的比例 */
  relapseRate: number | null;
  /** F0160 修复状态分布 */
  fixStatus: { 未修复: number; 验证中: number; 已修复: number };
  total: number;
}

export function aggregateErrorCauses(book: WrongBookEntry[]): ErrorCauseAggregate {
  const counts = new Map<string, number>();
  let fixed = 0;
  for (const w of book) {
    const cause = w.confirmedCause ?? w.suggested?.cause ?? "待确认";
    counts.set(cause, (counts.get(cause) ?? 0) + 1);
    if (w.status === "已修复") fixed += 1;
  }
  const total = book.length;
  // 复发率：发生过「复发」的条目 / 曾进入验证中的条目
  const everVerified = book.filter((w) => w.status === "验证中" || w.status === "已修复" || w.status === "复发");
  const relapsed = book.filter((w) => w.status === "复发").length;
  return {
    ranking: [...counts.entries()]
      .map(([cause, count]) => ({
        cause,
        count,
        share: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count),
    relapseRate: everVerified.length === 0 ? null : Math.round((relapsed / everVerified.length) * 100),
    fixStatus: {
      未修复: book.filter((w) => w.status === "待判断" || w.status === "待确认" || w.status === "复发").length,
      验证中: book.filter((w) => w.status === "验证中").length,
      已修复: fixed,
    },
    total,
  };
}

/** F0150 犹豫正确：高耗时且答对 → 关注库 */
export function hesitantCorrect(attempts: AttemptRecord[]): AttemptRecord[] {
  return attempts.filter((a) => a.correct && a.seconds >= 90);
}

/** F0154/F0155 执行错误与时间压力识别（从轨迹推断） */
export function executionAndTimePressure(
  attempts: AttemptRecord[],
): { execution: number; timePressure: number; evidence: string[] } {
  const evidence: string[] = [];
  let execution = 0;
  let timePressure = 0;
  for (const a of attempts) {
    if (!a.correct && a.answerChanges >= 2) {
      execution += 1;
      evidence.push(`${a.knowledgePoint}：反复改答案仍未答对，倾向执行/计算错误。`);
    }
    if (!a.correct && a.seconds <= 20) {
      timePressure += 1;
      evidence.push(`${a.knowledgePoint}：20 秒内作答且答错，疑似仓促或时间压力。`);
    }
  }
  return { execution, timePressure, evidence: evidence.slice(0, 5) };
}

/** ISO 周键（YYYY-Www），用于按周而不是按天聚合。 */
function isoWeekKey(iso: string): string {
  const date = new Date(iso);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO 8601：周四所在的年即该周的年份
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** F0279 错因趋势：按 ISO 周统计各错因频次（此前误按天聚合）。 */
export function errorCauseTrend(
  book: WrongBookEntry[],
): Array<{ week: string; cause: string; count: number }> {
  const out: Array<{ week: string; cause: string; count: number }> = [];
  const map = new Map<string, number>();
  for (const w of book) {
    const cause = w.confirmedCause ?? w.suggested?.cause ?? "待确认";
    const week = isoWeekKey(w.addedAt);
    const key = `${week}｜${cause}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  for (const [key, count] of map) {
    const [week, cause] = key.split("｜");
    out.push({ week: week!, cause: cause!, count: count! });
  }
  return out.sort((a, b) => a.week.localeCompare(b.week));
}

// ---------- 分数预测（F0192/F0193） ----------

export interface ScoreForecast {
  low: number;
  high: number;
  /** 区间中值 */
  mid: number;
  confidence: "高" | "中" | "低";
  note: string;
  dataNote: string;
}

/** 预测区间：模考总分滚动 ± 波动幅度；禁伪精确（区间表达，F0198 拒绝 73.428%） */
export function forecastScore(
  mockTotals: Array<number | null>,
  baselineConfidence: string | null,
): ScoreForecast | null {
  const valid = mockTotals.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)]!;
  const spread =
    valid.length >= 3 ? Math.max(4, Math.round((sorted[sorted.length - 1]! - sorted[0]!) * 0.6)) : 12;
  const low = Math.round((mid - spread / 2) * 10) / 10;
  const high = Math.round((mid + spread / 2) * 10) / 10;
  const confidence = valid.length >= 4 && baselineConfidence === "高" ? "高" : valid.length >= 2 ? "中" : "低";
  return {
    low,
    high,
    mid: Math.round(mid * 10) / 10,
    confidence,
    note:
      confidence === "低"
        ? "数据太少，这个区间只是占位参考；再考 1–2 次模考后才有方向感。"
        : `基于最近 ${valid.length} 次模考的波动区间。预测的是「当前水平的合理范围」，不是上岸线。`,
    dataNote: `样本 ${valid.length} 次模考`,
  };
}

// ---------- 模考策略（F0195–F0197 / F0181 / F0184 / F0189） ----------

export interface ModulePace {
  moduleId: string;
  /** 秒/题 */
  secondsPerQuestion: number;
  accuracy: number;
}

/** F0195 作答顺序建议 + F0196 时间预算：先做「快且对」的模块 */
export function suggestModuleOrder(paces: ModulePace[]): Array<{
  moduleId: string;
  suggestedOrder: number;
  suggestedMinutes: number;
  rationale: string;
}> {
  const scored = paces
    .map((p) => ({
      ...p,
      efficiency: p.accuracy / Math.max(p.secondsPerQuestion, 1),
    }))
    .sort((a, b) => b.efficiency - a.efficiency);
  return scored.map((p, i) => ({
    moduleId: p.moduleId,
    suggestedOrder: i + 1,
    suggestedMinutes: Math.max(8, Math.round((p.secondsPerQuestion / 60) * 15)),
    rationale:
      i === 0
        ? "正确率高且节奏快，放在开头建立节奏感。"
        : p.accuracy < 0.5
          ? "正确率偏低，放在最后，时间不够时优先保其他模块。"
          : "中等收益，按序作答。",
  }));
}

/** F0197 实验验证：下一场模考验证一个策略 */
export function nextExamExperiment(
  order: Array<{ moduleId: string; suggestedOrder: number }>,
  currentOrder: string[],
): { hypothesis: string; metric: string; nullResult: string } | null {
  const suggested = order.map((o) => o.moduleId);
  const changed = suggested.some((m, i) => currentOrder[i] !== m);
  if (!changed) return null;
  return {
    hypothesis: `把「${suggested[0]}」提到第一个作答，观察前 20 分钟正确率是否提升。`,
    metric: "前 20 分钟作答正确率、整卷总分",
    nullResult: "若总分下降超过 3 分或明显不适应，下下次模考恢复原顺序，不算失败。",
  };
}

// ---------- 诊断增强 ----------

/** F0090 稳定性机会：高波动模块的稳定性收益 */
export function stabilityOpportunity(
  ability: AbilityDimensions,
): { moduleId: string; note: string } | null {
  if (ability.stability.level !== "波动") return null;
  const weakestType = ability.byType.find((t) => t.accuracy != null && t.accuracy < 0.75);
  if (!weakestType) return null;
  return {
    moduleId: weakestType.type,
    note: `跨场次波动较大（标准差 ${ability.stability.sd}）。先固定做对该模块的基础题，稳定性本身就是分数。`,
  };
}

/** F0095 反事实解释：为什么不是看似更弱的模块 */
export function counterfactualExplanation(
  opportunities: Array<{ moduleId: string; kind: string; priorityScore: number; estimatedHours: number }>,
  weakestModuleId: string | null,
): string | null {
  if (!weakestModuleId) return null;
  const weakest = opportunities.find((o) => o.moduleId === weakestModuleId);
  if (weakest) {
    return `「${weakestModuleId}」确实最弱，但补基础预计需要约 ${weakest.estimatedHours} 小时，单位时间收益低于排在前面的机会，所以它没有占用今日焦点——不是不重要，是顺序问题。`;
  }
  return `「${weakestModuleId}」数据不足以支撑提分判断（可能样本少或缺口属于长期概念问题），因此未进入本次机会列表。`;
}

/** F0098 预计影响：区间/等级而非假精确 */
export function impactBand(estimatedGain: number): { band: string; text: string } {
  if (estimatedGain >= 8) return { band: "高", text: "预计可提 8 分以上（区间估计）" };
  if (estimatedGain >= 4) return { band: "中", text: "预计可提 4–8 分（区间估计）" };
  return { band: "低", text: "预计可提 0–4 分（区间估计），但投入也小" };
}

/** F0102/F0103 诊断历史：版本对比 + 结论有效期 */
export interface DiagnosisHistoryEntry {
  generatedAt: string;
  topModuleId: string | null;
  provisional: boolean;
}

export function diagnosisDelta(
  history: DiagnosisHistoryEntry[],
): { changed: boolean; text: string } {
  if (history.length < 2) {
    return { changed: false, text: "只有一次诊断记录；新的模考或 2 次训练后会生成对比。" };
  }
  const [latest, prev] = [history[0]!, history[1]!];
  if (latest.topModuleId !== prev.topModuleId) {
    return {
      changed: true,
      text: `与上次相比，首要机会从「${prev.topModuleId ?? "—"}」变为「${latest.topModuleId ?? "—"}」——新数据改变了优先级。`,
    };
  }
  return {
    changed: false,
    text: `首要机会保持「${latest.topModuleId ?? "—"}」，方向未变，继续执行。`,
  };
}

export function diagnosisStale(diagnosisAt: string, baselineAt: string): boolean {
  return baselineAt > diagnosisAt;
}
