/**
 * V1 处方增强：难度自适应（F0107）/ 训练组合（F0108）/ 间隔复测（F0109/
 * F0163）/ 脚手架淡出（F0111）/ 未完成原因（F0116）/ 缩短任务（F0118）/
 * 任务替换（F0058）/ 难度提示（F0060）/ 里程碑复盘（F0123）。
 */
import type { AbilityDimensions, AttemptRecord } from "@/lib/ability/dimensions";
import type { Diagnosis } from "@/lib/diagnosis/engine";
import type { Prescription } from "@/lib/prescription/engine";

/** F0107 难度自适应：按模块自动化程度选难度 */
export function adaptiveDifficulty(
  moduleId: string,
  ability: AbilityDimensions | null,
): 1 | 2 | 3 {
  if (!ability) return 2;
  const auto = ability.automation.ratio;
  if (auto == null) return 2;
  if (auto >= 0.7) return 3;
  if (auto >= 0.4) return 2;
  return 1;
}

/** F0060 难度提示文案 */
export function difficultyLabel(d: 1 | 2 | 3): "轻量" | "标准" | "挑战" {
  return d === 1 ? "轻量" : d === 2 ? "标准" : "挑战";
}

/** F0109/F0163 间隔复测：到期知识点（遗忘风险来自画像，已含距今天数） */
export function dueForReview(
  forgetting: AbilityDimensions["forgetting"],
  masteredKps: Set<string>,
): Array<{ knowledgePoint: string; reason: string }> {
  return forgetting
    .filter((f) => f.risk === "高" || (f.risk === "中" && masteredKps.has(f.knowledgePoint)))
    .slice(0, 5)
    .map((f) => ({
      knowledgePoint: f.knowledgePoint,
      reason:
        f.daysSince != null
          ? `距上次练习 ${f.daysSince} 天，${masteredKps.has(f.knowledgePoint) ? "曾掌握" : "上次未通过"}，安排复测验证。`
          : "安排复测验证。",
    }));
}

/** F0111/F0171 脚手架淡出：按模块正确率减少提示层级 */
export function scaffoldLevel(accuracy: number | null): 2 | 1 | 0 {
  if (accuracy == null) return 2;
  if (accuracy >= 0.8) return 0;
  if (accuracy >= 0.65) return 1;
  return 2;
}

/** F0116 未完成原因选项 */
export const INCOMPLETE_REASONS = ["时间不足", "太难", "计划不合理", "其他"] as const;
export type IncompleteReason = (typeof INCOMPLETE_REASONS)[number];

/** 未完成原因 → 计划调整建议（F0116/F0119/F0121） */
export function adjustPlanForReason(
  reason: IncompleteReason,
): { change: string; action: "缩量" | "降难度" | "重排" | "保持" } {
  switch (reason) {
    case "时间不足":
      return { change: "明天的处方按 60% 时长生成，保留 P0 任务。", action: "缩量" };
    case "太难":
      return { change: "任务难度下调一档，先回到能稳定完成的水平。", action: "降难度" };
    case "计划不合理":
      return {
        change: "已把任务时长上限收紧到 25 分钟，减少单次负担。",
        action: "重排",
      };
    default:
      return { change: "保持当前计划，明天先从最简单的任务开始。", action: "保持" };
  }
}

/** F0118 缩短任务：生成轻量版 */
export function lightenTask(
  task: Prescription["tasks"][number],
  ratio = 0.5,
): Prescription["tasks"][number] {
  const minutes = Math.max(5, Math.round(task.minutes * ratio));
  return {
    ...task,
    id: `${task.id}::light`,
    minutes,
    questionCount: Math.max(3, Math.round(task.questionCount * ratio)),
    title: `${task.title}（轻量版）`,
    successCriteria: `完成 ${Math.max(3, Math.round(task.questionCount * ratio))} 题即为达标，重质不重量。`,
  };
}

/** F0058 任务替换：给同模块的替代任务 */
export function replacementFor(
  task: Prescription["tasks"][number],
  diagnosis: Diagnosis | null,
): Prescription["tasks"][number] | null {
  if (!diagnosis) return null;
  const alt = diagnosis.opportunities.find((o) => o.moduleId === task.moduleId && o.kind !== (task.kind === "限时训练" ? "速度" : "准确率"));
  if (!alt) return null;
  return {
    ...task,
    id: `${task.id}::replacement`,
    title: `${task.moduleId}·${alt.kind === "速度" ? "限时训练" : "专项训练"}（替换）`,
    why: `替换理由：同属${task.moduleId}的提分机会（${alt.kind}），效果等价、换一种练法。`,
  };
}

/** F0123 里程碑复盘：到达阶段节点自动复盘 */
export function milestoneCheck(
  stage: string,
  examDate: string,
  baselineConfidence: string | null,
  now: Date = new Date(),
): { due: boolean; title: string; agenda: string[] } {
  const days = Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86_400_000);
  const thresholds: Record<string, number> = { 零基础: 180, 基础: 150, 强化: 90, 冲刺: 30 };
  const due = days <= (thresholds[stage] ?? 90);
  return {
    due,
    title: due ? `进入${stage}阶段收尾，做一次里程碑复盘` : "尚未到达阶段节点",
    agenda: [
      "对照目标分数：各模块还差多少（看进展页，不凭感觉）",
      "判断当前处方是否仍然有效（连续两周无改善的项目要换）",
      baselineConfidence === "高" || baselineConfidence === "中"
        ? "基线可信，直接按诊断结果调整优先级"
        : "基线证据仍不足，先补 1–2 次模考再定调整",
    ],
  };
}

/** 综合处方增强（F0107/F0108）：给处方标注难度与组合类型 */
export function enhancePrescription(
  rx: Prescription,
  ability: AbilityDimensions | null,
): Prescription {
  return {
    ...rx,
    tasks: rx.tasks.map((t) => {
      const d = adaptiveDifficulty(t.moduleId, ability);
      const kind =
        t.kind === "错题复盘"
          ? t.kind
          : ability && ability.automation.ratio != null && ability.automation.ratio < 0.4
            ? "专项训练"
            : t.kind;
      return { ...t, title: `${t.title} · ${difficultyLabel(d)}`, kind };
    }),
  };
}

export type { AttemptRecord };
