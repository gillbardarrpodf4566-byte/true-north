import { describe, expect, it } from "vitest";
import { seedQuestions } from "@/lib/questions/seed";
import { appendAnswerChange, autoAssemble, buildMixedSet, buildWrongRetestSet, neighborQuestions, nextStepSuggestion, questionVersionHistory, strategyFeedback } from "./advanced";
import type { WrongBookEntry } from "@/lib/errorcause/engine";

describe("训练中心增强（F0126/F0128/F0129/F0131/F0138/F0140/F0143/F0147）", () => {
  it("混合练习跨模块轮换", () => {
    const qs = buildMixedSet(["言语理解", "资料分析", "判断推理"], 9);
    expect(qs).toHaveLength(9);
    expect(new Set(qs.map((q) => q.moduleId)).size).toBe(3);
  });
  it("自动组卷四模式都有可用结果", () => {
    for (const mode of ["专项", "混合", "复习", "速度"] as const) {
      expect(autoAssemble(["资料分析", "判断推理"], 6, mode)).toHaveLength(6);
    }
  });
  it("答案修改轨迹保留每次变更", () => {
    const t = appendAnswerChange({ questionId: "fa-1", changes: [], final: null, seconds: 30 }, 1);
    const t2 = appendAnswerChange(t, 2);
    expect(t2.changes).toHaveLength(2);
    expect(t2.changes[1]!.from).toBe(1);
  });
  it("策略反馈连接证据与下一步", () => {
    const q = seedQuestions("资料分析")[0]!;
    const r = strategyFeedback(q, { questionId: q.id, changes: [], final: q.answerIndex, seconds: 120 });
    expect(r.evidence).toContain("用时");
    expect(r.next.length).toBeGreaterThan(0);
  });
  it("错题复测与近邻题", () => {
    const q = seedQuestions("资料分析")[0]!;
    const book: WrongBookEntry[] = [{ questionId: q.id, moduleId: q.moduleId, addedAt: "", status: "验证中", suggested: null, confirmedCause: "计算错误", retestLog: [] }];
    expect(buildWrongRetestSet(book)).toHaveLength(1);
    expect(neighborQuestions(q).every((x) => x.knowledgePoint === q.knowledgePoint)).toBe(true);
  });
  it("结束后下一步按结果分流", () => {
    expect(nextStepSuggestion({ met: false, wrongCount: 2, remainingMinutes: 0 }).href).toBe("/train/wrongbook");
    expect(nextStepSuggestion({ met: true, wrongCount: 0, remainingMinutes: 12 }).label).toContain("近邻");
    expect(nextStepSuggestion({ met: true, wrongCount: 0, remainingMinutes: 0 }).href).toBe("/today");
  });
  it("题目版本履历有来源与变更", () => {
    const q = seedQuestions("资料分析")[0]!;
    expect(questionVersionHistory(q)[0]!.version).toBe("seed-v1");
  });
});
