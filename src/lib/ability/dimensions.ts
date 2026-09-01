/**
 * V1 能力模型增强（F0071 题型能力 / F0074 稳定性 / F0075 自动化 /
 * F0076 遗忘风险 / F0079 用户纠正）。
 * 全部为纯函数：输入作答与会话轨迹，输出画像维度；样本不足不下强结论。
 */

export interface AttemptRecord {
  moduleId: string;
  questionType: string;
  knowledgePoint: string;
  correct: boolean;
  /** 作答用时（秒） */
  seconds: number;
  /** 答案修改次数（F0131 轨迹） */
  answerChanges: number;
  at: string;
}

export interface AbilityDimensions {
  /** F0071 题型正确率 */
  byType: Array<{ type: string; accuracy: number | null; sample: number }>;
  /** F0074 稳定性：跨场次波动（正确率标准差，低=稳） */
  stability: { sd: number; level: "稳定" | "一般" | "波动" | null; sessions: number };
  /** F0075 自动化：快且正确 */
  automation: { ratio: number | null; note: string };
  /** F0076 遗忘风险：按知识点最近一次正确距今 + 复测表现 */
  forgetting: Array<{ knowledgePoint: string; risk: "高" | "中" | "低" | null; daysSince: number | null; note: string }>;
}

const FAST_SECONDS = 45;

export function computeAbilityDimensions(attempts: AttemptRecord[], now = new Date()): AbilityDimensions {
  // F0071 题型能力
  const typeMap = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const e = typeMap.get(a.questionType) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (a.correct) e.correct += 1;
    typeMap.set(a.questionType, e);
  }
  const byType = [...typeMap.entries()]
    .map(([type, e]) => ({
      type,
      accuracy: e.total >= 5 ? Math.round((e.correct / e.total) * 100) / 100 : null,
      sample: e.total,
    }))
    .sort((a, b) => b.sample - a.sample);

  // F0074 稳定性：按会话（按天聚合）正确率的样本标准差
  const byDay = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const day = a.at.slice(0, 10);
    const e = byDay.get(day) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (a.correct) e.correct += 1;
    byDay.set(day, e);
  }
  const dayRates = [...byDay.values()].filter((e) => e.total >= 3).map((e) => e.correct / e.total);
  let stability: AbilityDimensions["stability"] = { sd: 0, level: null, sessions: dayRates.length };
  if (dayRates.length >= 2) {
    const mean = dayRates.reduce((s, v) => s + v, 0) / dayRates.length;
    const sd = Math.sqrt(dayRates.reduce((s, v) => s + (v - mean) ** 2, 0) / (dayRates.length - 1));
    stability = {
      sd: Math.round(sd * 100) / 100,
      level: sd <= 0.08 ? "稳定" : sd <= 0.18 ? "一般" : "波动",
      sessions: dayRates.length,
    };
  }

  // F0075 自动化：快且正确的比例
  const eligible = attempts.filter((a) => a.seconds > 0);
  const fastCorrect = eligible.filter((a) => a.correct && a.seconds <= FAST_SECONDS).length;
  const automation = {
    ratio: eligible.length >= 5 ? Math.round((fastCorrect / eligible.length) * 100) / 100 : null,
    note:
      eligible.length >= 5
        ? `「${FAST_SECONDS} 秒内且答对」的题目占比。`
        : "样本不足，暂不计算自动化程度。",
  };

  // F0076 遗忘风险：按知识点
  const kpMap = new Map<string, { lastAt: string; correct: boolean; retestOk: boolean }>();
  for (const a of attempts) {
    const prev = kpMap.get(a.knowledgePoint);
    kpMap.set(a.knowledgePoint, {
      lastAt: a.at,
      correct: a.correct,
      retestOk: prev ? prev.retestOk || a.correct : a.correct,
    });
  }
  const forgetting: AbilityDimensions["forgetting"] = [];
  for (const [kp, v] of kpMap) {
    const days = Math.floor((now.getTime() - new Date(v.lastAt).getTime()) / 86_400_000);
    let risk: "高" | "中" | "低" | null = null;
    if (days >= 7 && v.correct) risk = "中";
    if (days >= 14) risk = "高";
    if (!v.correct) risk = days >= 3 ? "高" : "中";
    if (days < 3 && v.correct) risk = "低";
    forgetting.push({
      knowledgePoint: kp,
      risk,
      daysSince: days,
      note:
        risk === "高"
          ? `已 ${days} 天未练且最近一次${v.correct ? "答对" : "答错"}，建议安排复测。`
          : risk === "中"
            ? "接近复习窗口，可安排一次近邻题验证。"
            : "近期已练习，暂无遗忘风险信号。",
    });
  }
  forgetting.sort((a, b) => (b.risk === "高" ? 1 : 0) - (a.risk === "高" ? 1 : 0));

  return { byType, stability, automation, forgetting };
}

/** 画像用户纠正（F0079）：覆盖指定维度的系统判断 */
export interface ProfileCorrection {
  scope: "题型" | "知识点" | "错因";
  key: string;
  userSays: string;
  at: string;
}

/** F0091 复习机会：高遗忘风险但曾掌握（历史上连续答对过 ≥2 次） */
export function reviewOpportunities(
  forgetting: AbilityDimensions["forgetting"],
  masteredKps: Set<string>,
): string[] {
  return forgetting
    .filter((f) => f.risk === "高" && masteredKps.has(f.knowledgePoint))
    .map((f) => f.knowledgePoint);
}
