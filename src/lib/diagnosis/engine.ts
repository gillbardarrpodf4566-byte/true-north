/**
 * 提分机会诊断引擎（AI提分诊断 F0081–F0101 / 核心特色 C04）。
 *
 * 规范原文只给出判据「最弱项不等于最高优先级；综合潜在收益、考试相关性、
 * 可训练性、时间成本和置信度」，没有给出算式。本文件的量化模型是实现补充，
 * 记录在 docs/05-实现/spec-gaps.md GAP-8，任何参数调整都应同步该文档。
 *
 * 输出必须满足：结论可追溯到输入证据（F0094/F0096）、置信度分档（F0097）、
 * 低样本只给候选不给定论（F0086）。
 */
import { MODULES, MODULE_FULL_SCORE, TOTAL_FULL_SCORE, type ModuleId } from "@/lib/profile/types";
import type { BaselineSnapshot } from "@/lib/profile/store";
import type { ExamGoal, LearningConditions } from "@/lib/profile/types";

export type OpportunityKind = "速度" | "准确率" | "概念补基础";

export interface Evidence {
  label: string;
  detail: string;
  /** 事实 = 直接来自数据；推断 = 系统计算得出（§9.5 Trust Calibration 分层） */
  kind: "事实" | "推断";
}

export interface Opportunity {
  moduleId: ModuleId;
  kind: OpportunityKind;
  /** 一句话结论（F0093 首屏只展示最关键判断） */
  headline: string;
  /** 预计可提分（分），用于排序与展示区间 */
  estimatedGain: number;
  /** 达成预计需要的训练小时 */
  estimatedHours: number;
  /** 排序分：单位时间预期收益 × 置信折扣 × 可训练性（GAP-8） */
  priorityScore: number;
  confidence: "高" | "中" | "低";
  evidence: Evidence[];
  /** 该判断在什么情况下会被推翻（§14.2 失效条件显式化） */
  invalidatedWhen: string;
}

export interface Diagnosis {
  generatedAt: string;
  /** 首屏一句话（F0093） */
  headline: string;
  /** 1–3 个机会，已按 priorityScore 降序（F0087/F0092） */
  opportunities: Opportunity[];
  /** 低样本时为 true：结论降级为候选（F0086） */
  provisional: boolean;
  confidence: "高" | "中" | "低";
  /** 目标差距（F0056） */
  gapToTarget: number | null;
}

/** 目标正确率：按目标总分反推的平均正确率（考试相关性输入 F0084/F0085） */
function targetAccuracy(goal: ExamGoal | null): number {
  if (!goal) return 0.8;
  return Math.min(0.95, Math.max(0.5, goal.targetTotal / TOTAL_FULL_SCORE));
}

/**
 * 可训练性系数（GAP-8）：
 * - 速度问题最容易见效（方法与节奏训练，短周期可验证）→ 1.0
 * - 准确率在及格线附近，靠题型专项可提升 → 0.7
 * - 正确率极低说明概念缺口，短期投入产出比低 → 0.35
 */
const TRAINABILITY: Record<OpportunityKind, number> = {
  速度: 1.0,
  准确率: 0.7,
  概念补基础: 0.35,
};

/** 置信折扣（GAP-8）：样本不足时压低排序分，避免用噪声驱动处方 */
const CONFIDENCE_DISCOUNT = { 高: 1.0, 中: 0.85, 低: 0.6 } as const;

/** 速度阈值：单题秒数超过该值视为速度瓶颈（按模块题型复杂度差异化） */
const SPEED_THRESHOLD: Record<ModuleId, number> = {
  言语理解: 55,
  判断推理: 70,
  数量关系: 110,
  资料分析: 90,
  常识判断: 30,
};

function moduleConfidence(sampleQuestions: number): "高" | "中" | "低" {
  if (sampleQuestions >= 120) return "高";
  if (sampleQuestions >= 40) return "中";
  return "低";
}

export function diagnose(
  baseline: BaselineSnapshot,
  goal: ExamGoal | null,
  conditions: LearningConditions | null,
  now = new Date(),
): Diagnosis {
  const target = targetAccuracy(goal);
  const opportunities: Opportunity[] = [];
  void conditions; // 可用时间参与处方生成（prescription.ts），不影响诊断排序

  for (const id of MODULES) {
    const row = baseline.modules.find((m) => m.id === id);
    if (!row || row.accuracy == null) continue; // 无数据不下结论（F0086）

    const full = MODULE_FULL_SCORE[id];
    const conf = moduleConfidence(row.sampleQuestions);
    const speedOver =
      row.secondsPerQuestion != null && row.secondsPerQuestion > SPEED_THRESHOLD[id];

    // 分类：正确率已达目标但耗时超阈值 → 速度机会（F0089）
    let kind: OpportunityKind;
    if (row.accuracy >= target && speedOver) kind = "速度";
    else if (row.accuracy < 0.45) kind = "概念补基础";
    else kind = "准确率";

    // 潜在收益（分）：准确率缺口 × 模块满分；速度型按「省下的时间换成后段做题」折算
    const accuracyHeadroom = Math.max(0, target - row.accuracy);
    const gainFromAccuracy = accuracyHeadroom * full;
    const gainFromSpeed =
      kind === "速度" && row.secondsPerQuestion != null
        ? ((row.secondsPerQuestion - SPEED_THRESHOLD[id]) / row.secondsPerQuestion) * full * 0.35
        : 0;
    const estimatedGain = round1(Math.max(gainFromAccuracy, gainFromSpeed));
    if (estimatedGain < 0.5) continue; // 收益太小不占用今日焦点

    // 时间成本：每 1 分收益的基础工时随类型不同（GAP-8）
    const hoursPerPoint = kind === "速度" ? 1.5 : kind === "准确率" ? 2.5 : 6;
    const estimatedHours = round1(estimatedGain * hoursPerPoint);

    const priorityScore =
      (estimatedGain / Math.max(estimatedHours, 0.5)) *
      TRAINABILITY[kind] *
      CONFIDENCE_DISCOUNT[conf] *
      (full / TOTAL_FULL_SCORE + 0.6); // 考试相关性：模块分值占比加权

    opportunities.push({
      moduleId: id,
      kind,
      headline: headlineFor(id, kind, row, target),
      estimatedGain,
      estimatedHours,
      priorityScore: round4(priorityScore),
      confidence: conf,
      evidence: evidenceFor(id, row, target, kind),
      invalidatedWhen:
        kind === "速度"
          ? "如果下一次训练的单题用时回到基线内，这条会自动降级。"
          : "如果下一次训练正确率显著回升，这条会自动降级。",
    });
  }

  opportunities.sort((a, b) => b.priorityScore - a.priorityScore);
  const top = opportunities.slice(0, 3);
  const provisional = baseline.confidence === "冷启动" || baseline.confidence === "低";

  return {
    generatedAt: now.toISOString(),
    headline: top[0]
      ? provisional
        ? `目前更像是「${top[0].moduleId}${top[0].kind}」的问题，但证据还不够稳定。`
        : top[0].headline
      : "数据还不足以判断你的主要瓶颈。",
    opportunities: top,
    provisional,
    confidence: baseline.confidence === "高" ? "高" : baseline.confidence === "中" ? "中" : "低",
    gapToTarget: goal ? round1(goal.targetTotal - estimateCurrentTotal(baseline)) : null,
  };
}

function headlineFor(
  id: ModuleId,
  kind: OpportunityKind,
  row: BaselineSnapshot["modules"][number],
  target: number,
): string {
  const acc = row.accuracy == null ? "—" : `${Math.round(row.accuracy * 100)}%`;
  switch (kind) {
    case "速度":
      return `${id}你已经会做，现在的问题是执行速度：正确率 ${acc}，但每题约 ${row.secondsPerQuestion} 秒。`;
    case "准确率":
      return `${id}正确率 ${acc}，距目标 ${Math.round(target * 100)}% 还有可提的空间，题型专项见效最快。`;
    case "概念补基础":
      return `${id}正确率 ${acc}，属于基础缺口；短期投入产出比低，先不占今日焦点。`;
  }
}

function evidenceFor(
  id: ModuleId,
  row: BaselineSnapshot["modules"][number],
  target: number,
  kind: OpportunityKind,
): Evidence[] {
  const ev: Evidence[] = [
    {
      kind: "事实",
      label: "样本量",
      detail: `基于 ${row.sampleQuestions} 道题的记录。`,
    },
  ];
  if (row.accuracyLow != null && row.accuracyHigh != null) {
    ev.push({
      kind: "事实",
      label: "正确率区间",
      detail: `${Math.round(row.accuracyLow * 100)}% – ${Math.round(row.accuracyHigh * 100)}%，目标 ${Math.round(
        target * 100,
      )}%。`,
    });
  }
  if (row.secondsPerQuestion != null) {
    ev.push({
      kind: "事实",
      label: "单题用时",
      detail: `平均 ${row.secondsPerQuestion} 秒，${id}的参考阈值是 ${SPEED_THRESHOLD[id]} 秒。`,
    });
  }
  ev.push({
    kind: "推断",
    label: "为什么是这一项",
    detail:
      kind === "速度"
        ? "准确率已达目标，把用时压回阈值内即可在同样时长里多做题，是当前单位时间收益最高的一项。"
        : kind === "准确率"
          ? "正确率缺口乘以模块分值后的潜在收益，除以预计训练工时后仍排在前列。"
          : "缺口大但达成工时高，单位时间收益低于其他项，因此不排在最前。",
  });
  return ev;
}

function estimateCurrentTotal(baseline: BaselineSnapshot): number {
  let total = 0;
  for (const m of baseline.modules) {
    if (m.accuracy == null) continue;
    total += m.accuracy * MODULE_FULL_SCORE[m.id];
  }
  return round1(total);
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;
