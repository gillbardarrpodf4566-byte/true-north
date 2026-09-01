import { describe, expect, it } from "vitest";
import {
  aggregateErrorCauses,
  counterfactualExplanation,
  diagnosisDelta,
  diagnosisStale,
  errorCauseTrend,
  executionAndTimePressure,
  forecastScore,
  hesitantCorrect,
  impactBand,
  nextExamExperiment,
  stabilityOpportunity,
  suggestModuleOrder,
} from "./v1";
import type { AbilityDimensions } from "@/lib/ability/dimensions";
import type { WrongBookEntry } from "@/lib/errorcause/engine";

const entry = (id: string, cause: string | null, status: WrongBookEntry["status"], at: string): WrongBookEntry => ({
  questionId: id,
  moduleId: "资料分析",
  addedAt: at,
  status,
  suggested: cause ? { cause: cause as never, confidence: "高", evidence: "", needsUserConfirm: false } : null,
  confirmedCause: cause as never,
  retestLog: [],
});

describe("错因聚合（F0158–F0160/F0279）", () => {
  it("排行、复发率与修复状态", () => {
    const book = [
      entry("a", "审题错误", "已修复", "2026-08-01"),
      entry("b", "审题错误", "复发", "2026-08-05"),
      entry("c", "计算错误", "验证中", "2026-08-08"),
      entry("d", "审题错误", "验证中", "2026-08-10"),
    ];
    const agg = aggregateErrorCauses(book);
    expect(agg.ranking[0]!.cause).toBe("审题错误");
    expect(agg.ranking[0]!.share).toBe(75);
    // 复发率 = 复发 1 / 曾进入验证流程 4（验证中2+已修复1+复发1）
    expect(agg.relapseRate).toBe(25);
    expect(agg.fixStatus.已修复).toBe(1);
    expect(agg.fixStatus.验证中).toBe(2);
    expect(errorCauseTrend(book).length).toBeGreaterThan(0);
  });
});

describe("犹豫正确与执行/时间压力（F0150/F0154/F0155）", () => {
  const attempts = [
    { moduleId: "资料分析", questionType: "图表型资料", knowledgePoint: "比重", correct: true, seconds: 120, answerChanges: 0, at: "2026-08-30" },
    { moduleId: "言语理解", questionType: "逻辑填空", knowledgePoint: "实词辨析", correct: false, seconds: 15, answerChanges: 0, at: "2026-08-30" },
    { moduleId: "数量关系", questionType: "数学运算", knowledgePoint: "工程问题", correct: false, seconds: 60, answerChanges: 3, at: "2026-08-30" },
  ];
  it("高耗时答对进关注库", () => {
    expect(hesitantCorrect(attempts)).toHaveLength(1);
  });
  it("改答案多次=执行错误；秒答错=时间压力", () => {
    const r = executionAndTimePressure(attempts);
    expect(r.execution).toBe(1);
    expect(r.timePressure).toBe(1);
    expect(r.evidence.length).toBe(2);
  });
});

describe("分数预测（F0192/F0193）", () => {
  it("区间表达 + 置信随样本提升；禁伪精确", () => {
    const f = forecastScore([120, 128, 124, 126], "高")!;
    expect(f.high - f.low).toBeGreaterThanOrEqual(4);
    expect(f.confidence).toBe("高");
    expect(f.note).toContain("区间");
    const small = forecastScore([125], "低")!;
    expect(small.confidence).toBe("低");
    expect(small.note).toContain("占位参考");
    expect(forecastScore([], "低")).toBeNull();
  });
});

describe("模考策略（F0195–F0197）", () => {
  it("按「效率」建议作答顺序与时间预算", () => {
    const order = suggestModuleOrder([
      { moduleId: "资料分析", secondsPerQuestion: 55, accuracy: 0.85 },
      { moduleId: "数量关系", secondsPerQuestion: 120, accuracy: 0.4 },
      { moduleId: "言语理解", secondsPerQuestion: 65, accuracy: 0.75 },
    ]);
    expect(order[0]!.moduleId).toBe("资料分析");
    expect(order[order.length - 1]!.moduleId).toBe("数量关系");
  });
  it("顺序有变化时给实验建议 + 无效结果出口", () => {
    const order = suggestModuleOrder([
      { moduleId: "资料分析", secondsPerQuestion: 55, accuracy: 0.85 },
      { moduleId: "言语理解", secondsPerQuestion: 65, accuracy: 0.75 },
    ]);
    const exp = nextExamExperiment(order, ["言语理解", "资料分析"]);
    expect(exp).not.toBeNull();
    expect(exp!.nullResult).toContain("不算失败");
    expect(nextExamExperiment(order, ["资料分析", "言语理解"])).toBeNull();
  });
});

describe("诊断增强（F0090/F0095/F0098/F0102/F0103）", () => {
  const ability: AbilityDimensions = {
    byType: [{ type: "逻辑填空", accuracy: 0.7, sample: 40 }],
    stability: { sd: 0.22, level: "波动", sessions: 4 },
    automation: { ratio: 0.5, note: "" },
    forgetting: [],
  };
  it("波动时给出稳定性机会（F0090）", () => {
    const op = stabilityOpportunity(ability);
    expect(op).not.toBeNull();
    expect(op!.note).toContain("标准差");
  });
  it("反事实解释（F0095）", () => {
    const t = counterfactualExplanation(
      [
        { moduleId: "资料分析", kind: "速度", priorityScore: 1.2, estimatedHours: 9 },
        { moduleId: "数量关系", kind: "概念补基础", priorityScore: 0.5, estimatedHours: 30 },
      ],
      "数量关系",
    );
    expect(t).toContain("不是不重要");
    const missing = counterfactualExplanation(
      [{ moduleId: "资料分析", kind: "速度", priorityScore: 1.2, estimatedHours: 9 }],
      "常识判断",
    );
    expect(missing).toContain("数据不足");
  });
  it("影响区间非假精确（F0098）", () => {
    expect(impactBand(9).band).toBe("高");
    expect(impactBand(2).text).toContain("区间");
  });
  it("诊断版本对比与有效期（F0102/F0103）", () => {
    const h = [
      { generatedAt: "2026-08-30", topModuleId: "言语理解", provisional: false },
      { generatedAt: "2026-08-20", topModuleId: "资料分析", provisional: false },
    ];
    expect(diagnosisDelta(h).changed).toBe(true);
    expect(diagnosisDelta([h[0]!]).text).toContain("只有一次");
    expect(diagnosisStale("2026-08-01", "2026-08-30")).toBe(true);
  });
});
