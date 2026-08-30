import { describe, expect, it } from "vitest";
import { diagnose } from "./engine";
import type { BaselineSnapshot } from "@/lib/profile/store";
import type { ExamGoal, LearningConditions, ModuleId } from "@/lib/profile/types";

const goal: ExamGoal = {
  type: "国考",
  examName: "2026年国考",
  region: "广东省",
  examDate: "2026-11-29",
  targetTotal: 108, // → 目标正确率 0.8
  targetModules: {},
};

const conditions: LearningConditions = {
  weekdayMinutes: 60,
  weekendMinutes: 120,
  stage: "强化",
  selfWeakModules: [],
};

function row(
  id: ModuleId,
  accuracy: number | null,
  seconds: number | null,
  sample = 200,
): BaselineSnapshot["modules"][number] {
  return {
    id,
    accuracy,
    accuracyLow: accuracy == null ? null : accuracy - 0.03,
    accuracyHigh: accuracy == null ? null : accuracy + 0.03,
    secondsPerQuestion: seconds,
    sampleQuestions: sample,
  };
}

function baseline(
  modules: BaselineSnapshot["modules"],
  confidence: BaselineSnapshot["confidence"] = "高",
): BaselineSnapshot {
  return { computedAt: "2026-08-30", modules, confidence, dataNote: "" };
}

describe("提分机会诊断引擎（C04 / F0087–F0097）", () => {
  it("最弱项不等于最高优先级（F0088）：数量关系最弱但不排第一", () => {
    const b = baseline([
      row("数量关系", 0.3, 100), // 最弱，概念缺口
      row("资料分析", 0.82, 120), // 已达标但慢 → 速度机会
      row("言语理解", 0.78, 50),
      row("判断推理", 0.8, 60),
      row("常识判断", 0.7, 25),
    ]);
    const d = diagnose(b, goal, conditions);
    expect(d.opportunities[0]!.moduleId).toBe("资料分析");
    expect(d.opportunities[0]!.kind).toBe("速度");
    // 数量关系若入选也只能靠后
    const idx = d.opportunities.findIndex((o) => o.moduleId === "数量关系");
    if (idx >= 0) expect(idx).toBeGreaterThan(0);
  });

  it("识别速度机会：正确率达标但耗时超阈值（F0089）", () => {
    const d = diagnose(baseline([row("资料分析", 0.85, 130)]), goal, conditions);
    expect(d.opportunities[0]!.kind).toBe("速度");
    expect(d.opportunities[0]!.headline).toContain("执行速度");
  });

  it("最多输出 3 个机会（F0087）且按 priorityScore 降序（F0092）", () => {
    const d = diagnose(
      baseline([
        row("言语理解", 0.5, 60),
        row("判断推理", 0.55, 80),
        row("数量关系", 0.4, 120),
        row("资料分析", 0.6, 100),
        row("常识判断", 0.5, 35),
      ]),
      goal,
      conditions,
    );
    expect(d.opportunities.length).toBeLessThanOrEqual(3);
    const scores = d.opportunities.map((o) => o.priorityScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("低样本 → provisional 候选而非定论（F0086）", () => {
    const d = diagnose(
      baseline([row("资料分析", 0.6, 100, 20)], "低"),
      goal,
      conditions,
    );
    expect(d.provisional).toBe(true);
    expect(d.headline).toContain("证据还不够稳定");
  });

  it("每个机会都带证据与失效条件（F0094/F0096 + §14.2）", () => {
    const d = diagnose(baseline([row("资料分析", 0.85, 130)]), goal, conditions);
    const op = d.opportunities[0]!;
    expect(op.evidence.length).toBeGreaterThanOrEqual(3);
    expect(op.evidence.some((e) => e.kind === "事实")).toBe(true);
    expect(op.evidence.some((e) => e.kind === "推断")).toBe(true);
    expect(op.invalidatedWhen).not.toBe("");
  });

  it("无数据模块不产出结论（F0086）", () => {
    const d = diagnose(baseline([row("常识判断", null, null, 0)], "冷启动"), goal, conditions);
    expect(d.opportunities).toHaveLength(0);
    expect(d.headline).toContain("数据还不足");
  });

  it("目标差距可计算（F0056）", () => {
    const d = diagnose(baseline([row("资料分析", 0.5, 90)]), goal, conditions);
    expect(d.gapToTarget).not.toBeNull();
  });
});
