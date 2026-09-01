import { describe, expect, it } from "vitest";
import {
  adaptiveDifficulty,
  adjustPlanForReason,
  difficultyLabel,
  dueForReview,
  enhancePrescription,
  lightenTask,
  milestoneCheck,
  replacementFor,
  scaffoldLevel,
} from "./adaptive";
import type { AbilityDimensions } from "@/lib/ability/dimensions";
import type { Diagnosis } from "@/lib/diagnosis/engine";
import type { Prescription } from "@/lib/prescription/engine";

const abilityHigh: AbilityDimensions = {
  byType: [],
  stability: { sd: 0, level: "稳定", sessions: 3 },
  automation: { ratio: 0.8, note: "" },
  forgetting: [],
};
const abilityLow: AbilityDimensions = {
  byType: [],
  stability: { sd: 0.1, level: "一般", sessions: 3 },
  automation: { ratio: 0.3, note: "" },
  forgetting: [
    { knowledgePoint: "基期与现期", risk: "高", daysSince: 20, note: "" },
    { knowledgePoint: "增长率计算", risk: "中", daysSince: 8, note: "" },
  ],
};

const rx: Prescription = {
  generatedAt: "2026-08-31",
  budgetMinutes: 60,
  changeReason: null,
  tasks: [
    {
      id: "t1",
      title: "资料分析限时训练",
      moduleId: "资料分析",
      targetAbility: "执行速度",
      minutes: 40,
      questionCount: 25,
      successCriteria: "25 题正确率 ≥75%。",
      why: "速度机会。",
      priority: "必须",
      kind: "限时训练",
    },
  ],
};

const diagnosis: Diagnosis = {
  generatedAt: "2026-08-31",
  headline: "",
  provisional: false,
  confidence: "高",
  gapToTarget: 10,
  opportunities: [
    {
      moduleId: "资料分析",
      kind: "准确率",
      headline: "",
      estimatedGain: 5,
      estimatedHours: 8,
      priorityScore: 1,
      confidence: "高",
      evidence: [],
      invalidatedWhen: "",
    },
  ],
};

describe("自适应处方（F0107/F0060/F0108/F0111）", () => {
  it("难度随自动化程度调整", () => {
    expect(adaptiveDifficulty("资料分析", abilityHigh)).toBe(3);
    expect(adaptiveDifficulty("资料分析", abilityLow)).toBe(1);
    expect(adaptiveDifficulty("资料分析", null)).toBe(2);
    expect(difficultyLabel(3)).toBe("挑战");
  });
  it("enhancePrescription 给任务标难度", () => {
    const out = enhancePrescription(rx, abilityLow);
    expect(out.tasks[0]!.title).toContain("轻量");
  });
  it("脚手架随正确率淡出（F0111）", () => {
    expect(scaffoldLevel(0.85)).toBe(0);
    expect(scaffoldLevel(0.7)).toBe(1);
    expect(scaffoldLevel(0.5)).toBe(2);
    expect(scaffoldLevel(null)).toBe(2);
  });
});

describe("间隔复测（F0109/F0163）", () => {
  it("高风险与曾掌握的中风险进入到期列表", () => {
    const due = dueForReview(abilityLow.forgetting, new Set(["增长率计算"]));
    expect(due.some((d) => d.knowledgePoint === "基期与现期")).toBe(true);
    expect(due.some((d) => d.knowledgePoint === "增长率计算")).toBe(true);
    expect(due[0]!.reason).toContain("天");
  });
});

describe("动态计划（F0116/F0118/F0058/F0123）", () => {
  it("未完成原因 → 调整动作（F0116）", () => {
    expect(adjustPlanForReason("时间不足").action).toBe("缩量");
    expect(adjustPlanForReason("太难").action).toBe("降难度");
    expect(adjustPlanForReason("计划不合理").action).toBe("重排");
  });
  it("轻量版任务（F0118）", () => {
    const light = lightenTask(rx.tasks[0]!);
    expect(light.minutes).toBe(20);
    expect(light.title).toContain("轻量版");
    expect(light.successCriteria).toContain("重质不重量");
  });
  it("任务替换给同模块替代练法（F0058）", () => {
    const alt = replacementFor(rx.tasks[0]!, diagnosis);
    expect(alt).not.toBeNull();
    expect(alt!.why).toContain("替换理由");
  });
  it("里程碑复盘按阶段节点触发（F0123）", () => {
    const due = milestoneCheck("冲刺", "2026-09-15", "高", new Date("2026-08-31"));
    expect(due.due).toBe(true);
    expect(due.agenda.length).toBe(3);
    const notDue = milestoneCheck("基础", "2027-06-01", "高", new Date("2026-08-31"));
    expect(notDue.due).toBe(false);
  });
});
