/**
 * 服务端 AI 评测（C16 Eval Flywheel / F0372–F0379）。
 * 由 /api/admin/aiops/eval 触发，在此进程真实执行：parser 用例驱动
 * MockAiGateway（含对抗样本），诊断用例驱动 diagnose 引擎。
 * 确定性 Grader：Schema 完整性 / 缺失不编造 / 最弱≠最高优先，全部程序断言。
 */
import { MockAiGateway } from "@/lib/ai/gateway";
import { diagnose } from "@/lib/diagnosis/engine";
import type { BaselineSnapshot } from "@/lib/profile/store";
import type { ExamGoal, ModuleId } from "@/lib/profile/types";

export interface EvalCaseResult {
  label: string;
  pass: boolean;
  detail: string;
}

export interface EvalOutcome {
  suite: "parser" | "diagnosis" | "essay";
  results: EvalCaseResult[];
  passRate: number;
  failures: string[];
  /** F0379 零容忍：对抗失败（Schema/编造类）直接拦截 */
  gateVerdict: "通过" | "拦截";
}

const GOAL: ExamGoal = {
  type: "国考",
  examName: "eval",
  region: "eval",
  examDate: "2026-11-29",
  targetTotal: 108,
  targetModules: {},
};

function makeBaseline(rows: Array<[ModuleId, number, number | null]>): BaselineSnapshot {
  return {
    computedAt: "eval",
    confidence: "高",
    dataNote: "",
    modules: rows.map(([id, acc, sec]) => ({
      id,
      accuracy: acc,
      accuracyLow: acc - 0.03,
      accuracyHigh: acc + 0.03,
      secondsPerQuestion: sec,
      sampleQuestions: 200,
    })),
  };
}

export async function runParserEval(): Promise<EvalOutcome> {
  const gw = new MockAiGateway();
  const results: EvalCaseResult[] = [];

  const normal = await gw.parseScoreScreenshot({ fileName: "eval-normal.png", sizeBytes: 10 });
  results.push({
    label: "正常截图",
    pass: normal.totalScore != null && normal.modules.every((m) => m.score != null),
    detail: `totalScore=${normal.totalScore}`,
  });

  const partial = await gw.parseScoreScreenshot({ fileName: "eval-partial.png", sizeBytes: 20 });
  const missingFlagged = partial.modules.some((m) => m.score == null);
  results.push({
    label: "缺失字段（禁止编造）",
    pass: missingFlagged && partial.totalScore == null,
    detail: missingFlagged ? "缺失字段已标记 missing" : "错误：缺失字段被编造",
  });

  const lowconf = await gw.parseScoreScreenshot({ fileName: "eval-lowconf.png", sizeBytes: 30 });
  results.push({
    label: "低置信标记",
    pass: Object.values(lowconf.confidence).includes("low"),
    detail: "存在 low 置信字段",
  });

  let corruptThrew = false;
  try {
    await gw.parseScoreScreenshot({ fileName: "eval-corrupt.bin", sizeBytes: 1 });
  } catch {
    corruptThrew = true;
  }
  results.push({
    label: "对抗样本（应失败而非硬编）",
    pass: corruptThrew,
    detail: corruptThrew ? "解析失败被正确抛出" : "错误：对抗样本被硬解析",
  });

  return finalize("parser", results);
}

export function runDiagnosisEval(): EvalOutcome {
  const results: EvalCaseResult[] = [];

  const d1 = diagnose(
    makeBaseline([
      ["资料分析", 0.82, 120],
      ["言语理解", 0.7, 50],
    ]),
    GOAL,
    null,
  );
  results.push({
    label: "典型：速度机会优先",
    pass: d1.opportunities[0]?.moduleId === "资料分析" && d1.opportunities[0]?.kind === "速度",
    detail: `top=${d1.opportunities[0]?.moduleId ?? "无"}`,
  });

  const d2 = diagnose(
    makeBaseline([
      ["数量关系", 0.3, 100],
      ["资料分析", 0.85, 125],
    ]),
    GOAL,
    null,
  );
  results.push({
    label: "边界：最弱≠最高优先",
    pass: d2.opportunities[0]?.moduleId !== "数量关系",
    detail: `top=${d2.opportunities[0]?.moduleId ?? "无"}`,
  });

  const empty = diagnose(makeBaseline([]), GOAL, null);
  results.push({
    label: "空数据：不出结论",
    pass: empty.opportunities.length === 0,
    detail: `机会数=${empty.opportunities.length}`,
  });

  return finalize("diagnosis", results);
}

function finalize(suite: EvalOutcome["suite"], results: EvalCaseResult[]): EvalOutcome {
  const passed = results.filter((r) => r.pass).length;
  const zeroToleranceFail = results.filter(
    (r) => (r.label.includes("对抗") || r.label.includes("编造")) && !r.pass,
  ).length;
  return {
    suite,
    results,
    passRate: Math.round((passed / Math.max(results.length, 1)) * 100),
    failures: results.filter((r) => !r.pass).map((r) => r.label),
    gateVerdict: zeroToleranceFail === 0 ? "通过" : "拦截",
  };
}
