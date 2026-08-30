import { describe, expect, it } from "vitest";
import { computeBaseline } from "./compute";
import type { ScoreImport } from "@/lib/profile/store";

function imp(scoreByModule: Record<string, number | null>, id = "x"): ScoreImport {
  return {
    id,
    source: "手工录入",
    platform: "手工",
    examLabel: "t",
    importedAt: "2026-08-01",
    totalScore: null,
    modules: Object.entries(scoreByModule).map(([mid, score]) => ({
      id: mid as ScoreImport["modules"][number]["id"],
      score,
      questions: 20,
      correct: score == null ? null : Math.round((score / 20) * 20),
      secondsPerQuestion: 60,
    })),
  };
}

describe("个人基线计算（F0067/F0068/F0069/F0072/F0073）", () => {
  it("无数据 → 冷启动：无点估计、有指引文案", () => {
    const b = computeBaseline([]);
    expect(b.confidence).toBe("冷启动");
    expect(b.modules.every((m) => m.accuracy == null)).toBe(true);
    expect(b.dataNote).toContain("上传");
  });

  it("单次导入 → 低可信 + 宽区间", () => {
    const b = computeBaseline([
      imp({ 资料分析: 14, 言语理解: 30 }, "a"),
    ]);
    expect(b.confidence).toBe("低");
    const m = b.modules.find((x) => x.id === "资料分析")!;
    expect(m.accuracy).toBeCloseTo(0.7, 1);
    expect(m.accuracyHigh! - m.accuracyLow!).toBeGreaterThan(0.3);
  });

  it("两次导入 → 中可信，区间由数据决定且不宽于冷启动", () => {
    const b = computeBaseline([
      imp({ 资料分析: 14 }, "a"),
      imp({ 资料分析: 16 }, "b"),
    ]);
    expect(b.confidence).toBe("中");
    const m = b.modules.find((x) => x.id === "资料分析")!;
    expect(m.accuracy).toBeCloseTo(0.75, 2);
    expect(m.accuracyHigh! - m.accuracyLow!).toBeLessThanOrEqual(0.4);
  });

  it("速度维度取均值（F0073）", () => {
    const b = computeBaseline([
      imp({ 资料分析: 14 }, "a"),
      imp({ 资料分析: 16 }, "b"),
    ]);
    const m = b.modules.find((x) => x.id === "资料分析")!;
    expect(m.secondsPerQuestion).toBe(60);
  });
});
