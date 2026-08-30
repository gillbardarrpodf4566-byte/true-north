/**
 * 学习处方引擎（学习处方与计划 F0104–F0122 / 核心特色 C05）。
 *
 * 规范硬约束：
 * - 每日核心任务 1–3 项（F0112），总时长不超过用户可用时间预算（F0106）
 * - 每项必须绑定单一可验证目标 + 成功标准 + 为什么今天做（F0104/F0059）
 * - 按今日可用时间缩放任务（F0054）
 * - 完成后记录结果而非仅勾选（F0115）
 * §7.6 Prescription Card 必须包含：任务名 / 预估时间 / 目标能力 / 为什么今天做 /
 * 成功判定 / 开始按钮。
 */
import type { Diagnosis, Opportunity } from "@/lib/diagnosis/engine";
import type { ModuleId } from "@/lib/profile/types";

export type TaskPriority = "必须" | "推荐" | "可选";

export interface PrescriptionTask {
  id: string;
  title: string;
  moduleId: ModuleId;
  /** 目标能力（§7.6） */
  targetAbility: string;
  minutes: number;
  questionCount: number;
  /** 成功判定（可验证，F0104） */
  successCriteria: string;
  /** 为什么今天做（F0059） */
  why: string;
  priority: TaskPriority;
  kind: "限时训练" | "专项训练" | "错题复盘";
}

export interface Prescription {
  generatedAt: string;
  /** 今日总时长预算（分钟） */
  budgetMinutes: number;
  tasks: PrescriptionTask[];
  /** 计划变更说明（F0121）；首次生成为 null */
  changeReason: string | null;
}

/** 每题预算（分钟）：按模块题型复杂度给出训练节奏 */
const MINUTES_PER_QUESTION: Record<ModuleId, number> = {
  言语理解: 0.9,
  判断推理: 1.2,
  数量关系: 1.8,
  资料分析: 1.5,
  常识判断: 0.5,
};

/**
 * 生成今日处方。
 * @param availableMinutes 今日实际可用时间（F0054：用户临时调整后按此缩放）
 */
export function buildPrescription(
  diagnosis: Diagnosis,
  availableMinutes: number,
  now = new Date(),
  changeReason: string | null = null,
): Prescription {
  const budget = Math.max(10, Math.round(availableMinutes));
  const tasks: PrescriptionTask[] = [];
  let remaining = budget;

  // P0 任务来自排序第一的机会（§9.1 Primary choice = 1）
  const [first, ...rest] = diagnosis.opportunities;
  if (first) {
    const task = taskFor(first, Math.min(remaining, Math.round(budget * 0.6)), "必须");
    if (task) {
      tasks.push(task);
      remaining -= task.minutes;
    }
  }

  // 最多再补 2 项（F0112 1–3 项），且不超预算（F0106）
  for (const op of rest) {
    if (tasks.length >= 3 || remaining < 10) break;
    const task = taskFor(op, Math.min(remaining, Math.round(budget * 0.3)), "推荐");
    if (task) {
      tasks.push(task);
      remaining -= task.minutes;
    }
  }

  // 时间还有余量则补一项错题复盘（低成本、高留存收益）
  if (remaining >= 10 && tasks.length < 3 && first) {
    const minutes = Math.min(remaining, 15);
    tasks.push({
      id: `rx-review-${now.getTime()}`,
      title: `${first.moduleId}错题复盘`,
      moduleId: first.moduleId,
      targetAbility: "错因修复与留存",
      minutes,
      questionCount: 0,
      successCriteria: "把上次的错题按错因归类，并说出正确路径。",
      why: "复盘比新题更快把已暴露的问题变成能力。",
      priority: "可选",
      kind: "错题复盘",
    });
  }

  return { generatedAt: now.toISOString(), budgetMinutes: budget, tasks, changeReason };
}

function taskFor(op: Opportunity, minutesCap: number, priority: TaskPriority): PrescriptionTask | null {
  const minutes = Math.max(10, Math.min(minutesCap, 45));
  if (minutes < 10) return null;
  const perQ = MINUTES_PER_QUESTION[op.moduleId];
  const questionCount = Math.max(5, Math.floor(minutes / perQ));

  if (op.kind === "速度") {
    return {
      id: `rx-speed-${op.moduleId}`,
      title: `${op.moduleId}限时训练`,
      moduleId: op.moduleId,
      targetAbility: "执行速度",
      minutes,
      questionCount,
      successCriteria: `${questionCount} 题在 ${minutes} 分钟内完成，正确率不低于 75%。`,
      why: op.headline,
      priority,
      kind: "限时训练",
    };
  }
  return {
    id: `rx-accuracy-${op.moduleId}`,
    title: `${op.moduleId}专项训练`,
    moduleId: op.moduleId,
    targetAbility: op.kind === "准确率" ? "题型准确率" : "基础概念",
    minutes,
    questionCount,
    successCriteria: `完成 ${questionCount} 题，正确率达到 ${op.kind === "准确率" ? "75%" : "60%"}。`,
    why: op.headline,
    priority,
    kind: "专项训练",
  };
}

/** 今日可用时间：按工作日/周末区分（F0020 输入 → F0054 缩放） */
export function todayBudget(
  weekdayMinutes: number,
  weekendMinutes: number,
  now = new Date(),
): number {
  const day = now.getDay();
  return day === 0 || day === 6 ? weekendMinutes : weekdayMinutes;
}
