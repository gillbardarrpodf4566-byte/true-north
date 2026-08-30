import { describe, expect, it } from "vitest";
import { allSeedQuestions, buildTrainingSet, questionById, seedQuestions } from "./seed";
import { MODULES } from "@/lib/profile/types";

describe("种子题库（GOAL_PROMPT 架构要求 5）", () => {
  it("5 个模块 × 每模块 20 题", () => {
    expect(MODULES).toHaveLength(5);
    for (const m of MODULES) {
      expect(seedQuestions(m)).toHaveLength(20);
    }
    expect(allSeedQuestions()).toHaveLength(100);
  });

  it("资料分析含表格材料题（图表/表格材料要求）", () => {
    const tableQs = seedQuestions("资料分析").filter((q) => q.material?.kind === "table");
    expect(tableQs.length).toBeGreaterThanOrEqual(20);
    expect(tableQs[0]!.material!.rows.length).toBe(5);
  });

  it("答案索引有效且确定性（同 id 同题）", () => {
    for (const q of allSeedQuestions()) {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.options[q.answerIndex]).toBeTruthy();
      expect(q.knowledgePoint).not.toBe("");
      expect(q.errorCauseByOption).toBeDefined();
    }
    const a = questionById("fa-0");
    const b = questionById("fa-0");
    expect(a).toEqual(b);
  });

  it("标签完备（F0145/F0146）", () => {
    const withRealExam = allSeedQuestions().filter((q) => q.realExam != null);
    expect(withRealExam.length).toBeGreaterThan(0);
    for (const q of withRealExam) {
      expect(q.realExam!.year).toBeGreaterThan(2000);
    }
  });

  it("训练集组装：数量与轮转（CL-03 step1）", () => {
    const set = buildTrainingSet("资料分析", 12, 0);
    expect(set).toHaveLength(12);
    expect(set[0]!.id).toBe("fa-0");
    const shifted = buildTrainingSet("资料分析", 12, 7);
    expect(shifted[0]!.id).toBe("fa-7");
    // 超出题池时降级复用（不超池大小）
    expect(buildTrainingSet("言语理解", 99)).toHaveLength(20);
  });
});
