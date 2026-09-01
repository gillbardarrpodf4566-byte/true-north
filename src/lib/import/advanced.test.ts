import { describe, expect, it } from "vitest";
import { extractTiming, parseHistoryJson, parsePracticeJson, parseWrongJson } from "./advanced";

describe("外部数据接入（F0039/F0042/F0043/F0044/F0048/F0049）", () => {
  it("历史批量导入：逐场记录 + 结构校验", () => {
    const r = parseHistoryJson(JSON.stringify([
      { date: "2026-08-01", examLabel: "模考1", totalScore: 120, modules: [{ id: "资料分析", score: 16, questions: 20, correct: 16 }] },
      { date: "bad", modules: [] },
    ]));
    expect(r.records).toHaveLength(2);
    expect(r.issues.some((x) => x.field === "date")).toBe(true);
    expect(r.issues.some((x) => x.field === "modules")).toBe(true);
    expect(r.records[0]!.sourceRef?.kind).toBe("external");
  });
  it("练习记录导入：用时提取确定性计算", () => {
    const r = parsePracticeJson(JSON.stringify([
      { date: "2026-08-01", moduleId: "资料分析", questionType: "图表型资料", questions: 10, correct: 8, totalSeconds: 600 },
      { date: "2026-08-02", moduleId: "资料分析", questionType: "图表型资料", questions: 5, correct: 4, totalSeconds: 270 },
    ]));
    expect(r.issues).toHaveLength(0);
    const timing = extractTiming(r.records);
    expect(timing.totalSeconds).toBe(870);
    expect(timing.perType["图表型资料"]).toBe(58);
  });
  it("错题导入：缺字段不编造错因", () => {
    const r = parseWrongJson(JSON.stringify([{ moduleId: "资料分析", questionText: "某题", userAnswer: "A", correctAnswer: "B" }]));
    expect(r.records[0]!.suggestedCause).toBeNull();
  });
});
