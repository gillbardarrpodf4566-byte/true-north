import { describe, expect, it } from "vitest";
import { buildPrescription, todayBudget } from "./engine";
import type { Diagnosis } from "@/lib/diagnosis/engine";

const diagnosis: Diagnosis = {
  generatedAt: "2026-08-30",
  headline: "资料分析你已经会做，现在的问题是执行速度。",
  provisional: false,
  confidence: "高",
  gapToTarget: 12,
  opportunities: [
    {
      moduleId: "资料分析",
      kind: "速度",
      headline: "资料分析执行速度偏慢",
      estimatedGain: 6,
      estimatedHours: 9,
      priorityScore: 1.2,
      confidence: "高",
      evidence: [],
      invalidatedWhen: "",
    },
    {
      moduleId: "言语理解",
      kind: "准确率",
      headline: "言语理解正确率有空间",
      estimatedGain: 4,
      estimatedHours: 10,
      priorityScore: 0.8,
      confidence: "中",
      evidence: [],
      invalidatedWhen: "",
    },
  ],
};

describe("学习处方引擎（C05 / F0104–F0122）", () => {
  it("任务数 1–3 项（F0112）", () => {
    const rx = buildPrescription(diagnosis, 90);
    expect(rx.tasks.length).toBeGreaterThanOrEqual(1);
    expect(rx.tasks.length).toBeLessThanOrEqual(3);
  });

  it("总时长不超过可用预算（F0106）", () => {
    for (const budget of [15, 30, 60, 90, 180]) {
      const rx = buildPrescription(diagnosis, budget);
      const total = rx.tasks.reduce((s, t) => s + t.minutes, 0);
      expect(total).toBeLessThanOrEqual(rx.budgetMinutes);
    }
  });

  it("按今日可用时间缩放（F0054）：预算越小任务越少/越短", () => {
    const small = buildPrescription(diagnosis, 20);
    const large = buildPrescription(diagnosis, 150);
    const smallTotal = small.tasks.reduce((s, t) => s + t.minutes, 0);
    const largeTotal = large.tasks.reduce((s, t) => s + t.minutes, 0);
    expect(smallTotal).toBeLessThan(largeTotal);
  });

  it("第一项为「必须」，来自排序第一的机会（§9.1）", () => {
    const rx = buildPrescription(diagnosis, 90);
    expect(rx.tasks[0]!.priority).toBe("必须");
    expect(rx.tasks[0]!.moduleId).toBe("资料分析");
    expect(rx.tasks[0]!.kind).toBe("限时训练");
  });

  it("每项都有可验证成功标准与为什么今天做（F0104/F0059）", () => {
    const rx = buildPrescription(diagnosis, 90);
    for (const t of rx.tasks) {
      expect(t.successCriteria).not.toBe("");
      expect(t.why).not.toBe("");
      expect(t.targetAbility).not.toBe("");
      expect(t.minutes).toBeGreaterThan(0);
    }
  });

  it("变更说明可携带（F0121）", () => {
    const rx = buildPrescription(diagnosis, 60, new Date(), "你今天只有 40 分钟，已压缩任务量。");
    expect(rx.changeReason).toContain("压缩");
  });

  it("工作日/周末取不同预算（F0020 → F0054）", () => {
    const monday = new Date("2026-08-31T09:00:00");
    const saturday = new Date("2026-09-05T09:00:00");
    expect(todayBudget(60, 120, monday)).toBe(60);
    expect(todayBudget(60, 120, saturday)).toBe(120);
  });
});
