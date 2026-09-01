/**
 * V1-D AI 质量运营扩展（F0374 申论评测集 / F0376 Rubric Grader /
 * F0377 人工校准 / F0380 纠错入池 / F0381 失败聚类 / F0388 降级策略 /
 * F0359 灰度开关 / F0370 Prompt diff / F0363 工单关联上下文）。
 */
import { gradeEssay } from "@/lib/essay/grade";
import { ESSAY_SEED, essayQuestionById } from "@/lib/essay/bank";
import type { EvalOutcome } from "@/lib/server/eval";

export interface EssayCaseResult {
  label: string;
  pass: boolean;
  detail: string;
}

/** F0376 Rubric Grader：确定性规则断言（不是模型自评） */
function rubricAssertions(
  questionId: string,
  text: string,
): { results: EssayCaseResult[]; failures: string[] } {
  const q = essayQuestionById(questionId)!;
  const g = gradeEssay({ id: `eval-${Date.now()}`, text }, q);
  const results: EssayCaseResult[] = [
    {
      label: `${q.type}·分数在 0–满分`,
      pass: g.score >= 0 && g.score <= q.rubric.fullScore,
      detail: `score=${g.score}`,
    },
    {
      label: `${q.type}·维度和不超过总分`,
      pass:
        g.dimensions.reduce((s, d) => s + d.score, 0) <= q.rubric.fullScore + 0.1,
      detail: `sum=${Math.round(g.dimensions.reduce((s, d) => s + d.score, 0) * 10) / 10}`,
    },
    {
      label: `${q.type}·topFixes ≤ 3`,
      pass: g.topFixes.length <= 3,
      detail: `n=${g.topFixes.length}`,
    },
    {
      label: `${q.type}·每个漏点带材料依据（证据要求）`,
      pass: g.misses.every((m) => m.materialQuote.length > 0),
      detail: `misses=${g.misses.length}`,
    },
    {
      label: `${q.type}·置信等级必填`,
      pass: ["高", "中", "低"].includes(g.confidence),
      detail: `confidence=${g.confidence}`,
    },
    {
      label: `${q.type}·字数与限制一致（F0203）`,
      pass: g.wordCount >= 0 && g.wordLimit === q.wordLimit,
      detail: `${g.wordCount}/${g.wordLimit}`,
    },
  ];
  return { results, failures: results.filter((r) => !r.pass).map((r) => r.label) };
}

/** 评分一致性案例（F0374）：同一答案两次评分必须完全一致（确定性） */
function consistencyCase(): EssayCaseResult {
  const q = ESSAY_SEED[0]!;
  const text = "依托一网统管平台统一接入数据，事件自动分派限时办结；推行免申即享，政策找人；为独居老人装水表智感设备自动预警。";
  const g1 = gradeEssay({ id: "c1", text }, q);
  const g2 = gradeEssay({ id: "c2", text }, q);
  return {
    label: "评分一致性：同答案两次评分一致",
    pass: g1.score === g2.score && g1.hits.length === g2.hits.length,
    detail: `${g1.score} vs ${g2.score}`,
  };
}

/** V1 申论评测集（F0374/F0376）：服务端可执行，确定性 Grader */
export function runEssayEval(): EvalOutcome {
  const results: EssayCaseResult[] = [];
  const cases: Array<{ qid: string; text: string }> = [
    { qid: "essay-gaikuang-1", text: "S市依托一网统管平台统一接入数据实现自动分派限时办结；推行随手拍小程序发动居民上报；实行免申即享和数据比对让政策找人；上线一表通精简报表；为独居老人安装水表智感设备自动预警上门处置。" },
    { qid: "essay-gaikuang-1", text: "搞了智慧治理，老百姓觉得方便。" },
    { qid: "essay-duice-1", text: "建议一是统一选品和质量标准加强监管；二是建设冷链物流降低损耗；三是培训主播并建立留才机制；四是打造区域公用品牌避免同质化；五是盘活闲置基地设备共享使用。" },
    { qid: "essay-gongwen-1", text: "一、活动目的：解决独居老人买菜就医难与双职工子女看护难。二、服务对象。三、活动内容：代买送菜、就医陪诊、四点半课堂。四、队伍组织：招募退休教师医护能人分组。五、保障：建立台账与积分激励，常态化开展。" },
  ];
  for (const c of cases) {
    const { results: r, failures } = rubricAssertions(c.qid, c.text);
    results.push(...r);
    void failures;
  }
  results.push(consistencyCase());

  const zeroToleranceFail = results.filter((r) => !r.pass && r.label.includes("证据")).length;
  const passed = results.filter((r) => r.pass).length;
  return {
    suite: "essay",
    results,
    passRate: Math.round((passed / results.length) * 100),
    failures: results.filter((r) => !r.pass).map((r) => r.label),
    gateVerdict: zeroToleranceFail === 0 ? "通过" : "拦截",
  };
}

// ---------- F0380 纠错入池 / F0381 失败聚类 ----------

export interface ErrorCandidate {
  id: string;
  /** 匿名化后的失败描述 */
  description: string;
  cluster: "解析错误" | "诊断不准" | "幻觉" | "批改偏差" | "其他";
  /** 来源模型/Prompt 版本（F0363 工单关联上下文） */
  context: { model: string; promptVersion: string };
  at: string;
  /** 是否已晋升为评测集用例 */
  promoted: boolean;
}

/**
 * F0381 失败聚类：按错误类型聚合；提供了来源版本时进一步按
 * 「类型 + 模型 + Prompt」细分，便于定位是哪个版本引入的退化。
 */
export function clusterFailures(
  candidates: Array<{ category: string; text: string; modelVersion?: string | null; promptVersion?: string | null }>,
): Array<{ cluster: string; count: number; sample: string; modelVersion?: string | null; promptVersion?: string | null }> {
  const map = new Map<string, { count: number; sample: string; modelVersion?: string | null; promptVersion?: string | null }>();
  for (const c of candidates) {
    const category = (["解析错误", "诊断不准", "幻觉", "批改偏差"] as const).includes(c.category as never)
      ? c.category
      : "其他";
    // 有可信来源版本时把版本并入聚类键；没有则退回纯类型，不臆造版本。
    const versioned = c.modelVersion || c.promptVersion;
    const cluster = versioned ? `${category} · ${c.modelVersion ?? "未知模型"}/${c.promptVersion ?? "未知Prompt"}` : category;
    const e = map.get(cluster) ?? { count: 0, sample: c.text.slice(0, 40), modelVersion: c.modelVersion ?? null, promptVersion: c.promptVersion ?? null };
    e.count += 1;
    map.set(cluster, e);
  }
  return [...map.entries()]
    .map(([cluster, v]) => ({ cluster, count: v.count, sample: v.sample, modelVersion: v.modelVersion, promptVersion: v.promptVersion }))
    .sort((a, b) => b.count - a.count);
}

// ---------- F0388 降级策略 ----------

export type AiFunction = "parse" | "diagnose" | "coach" | "errorcause" | "essay";

export interface DegradationDecision {
  fn: AiFunction;
  allowed: boolean;
  fallback: "备用模型" | "规则流程" | null;
  note: string;
}

/**
 * 主模型失败/超预算时的降级矩阵（F0388）：
 * 高价值且可规则化的能力降级到规则流程，体验类直接暂停。
 */
export function degradationPlan(
  fn: AiFunction,
  state: { primaryFailed: boolean; overBudget: boolean },
): DegradationDecision {
  if (!state.primaryFailed && !state.overBudget) {
    return { fn, allowed: true, fallback: null, note: "正常运行。" };
  }
  switch (fn) {
    case "parse":
      return { fn, allowed: true, fallback: "规则流程", note: "切本地 OCR 规则解析，缺字段照常标记缺失。" };
    case "diagnose":
      return { fn, allowed: true, fallback: "规则流程", note: "使用上次有效诊断 + GAP-8 规则排序。" };
    case "errorcause":
      return { fn, allowed: true, fallback: "规则流程", note: "仅按干扰项绑定错因提示，不推断。" };
    case "coach":
      return { fn, allowed: false, fallback: null, note: "对话类暂停，提示稍后再试；训练不受影响。" };
    case "essay":
      return { fn, allowed: true, fallback: "规则流程", note: "批改降级为 Rubric 采点版，置信度固定为「低」。" };
  }
}

// ---------- F0359 灰度开关 ----------

export interface FeatureFlag {
  key: string;
  description: string;
  /** all | none | percent */
  rollout: "all" | "none" | "percent";
  percent: number;
}

export const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "essay_coach", description: "申论 AI 教练（V1）", rollout: "all", percent: 100 },
  { key: "job_selection", description: "智能选岗（V1）", rollout: "all", percent: 100 },
  { key: "score_forecast", description: "分数预测区间（V1）", rollout: "percent", percent: 50 },
];

/** 灰度判定：稳定哈希，同一用户永远同一结果 */
export function isFlagEnabled(flag: FeatureFlag, userKey: string): boolean {
  if (flag.rollout === "all") return true;
  if (flag.rollout === "none") return false;
  let h = 0;
  for (let i = 0; i < userKey.length; i++) {
    h = (h * 31 + userKey.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100 < flag.percent;
}

/**
 * 合并后台配置与默认灰度：未配置或非法的键回落默认值，
 * 避免后台漏写一个键就让整条能力静默变成不可用/全量开放。
 */
export function resolveFeatureFlags(raw: unknown): FeatureFlag[] {
  const configured = Array.isArray(raw) ? raw : [];
  const byKey = new Map<string, FeatureFlag>(DEFAULT_FLAGS.map((flag) => [flag.key, { ...flag }]));
  for (const item of configured) {
    const candidate = item as Partial<FeatureFlag>;
    if (typeof candidate?.key !== "string") continue;
    const base = byKey.get(candidate.key);
    if (!base) continue;
    const rollout = candidate.rollout === "all" || candidate.rollout === "none" || candidate.rollout === "percent"
      ? candidate.rollout
      : base.rollout;
    const percent = typeof candidate.percent === "number" && Number.isFinite(candidate.percent)
      ? Math.min(100, Math.max(0, Math.round(candidate.percent)))
      : base.percent;
    byKey.set(candidate.key, { ...base, rollout, percent });
  }
  return [...byKey.values()];
}

/** 服务端能力门禁：未知键按未开放处理。 */
export function featureEnabledFor(raw: unknown, key: string, subject: string): boolean {
  const flag = resolveFeatureFlags(raw).find((item) => item.key === key);
  return flag ? isFlagEnabled(flag, subject) : false;
}
