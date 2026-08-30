/**
 * 个人基线计算（个人基线与能力画像：F0067 冷启动 / F0068 个人基线 /
 * F0069 基线置信度 / F0072 正确率与置信区间 / F0073 速度维度）。
 *
 * 设计约束（DESIGN.md §14.2）：无证据时不强结论——数据不足时输出冷启动
 * 宽区间而不是精确值；置信度以数据量表达。
 */
import { MODULES, type ModuleId } from "@/lib/profile/types";
import type { BaselineSnapshot, ScoreImport } from "@/lib/profile/store";

const MODULE_QUESTION_COUNT: Record<ModuleId, number> = {
  言语理解: 40,
  判断推理: 40,
  数量关系: 10,
  资料分析: 20,
  常识判断: 20,
};

export function computeBaseline(imports: ScoreImport[], now = new Date()): BaselineSnapshot {
  const modules = MODULES.map((id) => {
    const rows = imports
      .map((imp) => imp.modules.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => m != null);

    const accs: number[] = [];
    const speeds: number[] = [];
    let sampleQuestions = 0;
    for (const m of rows) {
      if (m.correct != null && m.questions != null && m.questions > 0) {
        accs.push(m.correct / m.questions);
        sampleQuestions += m.questions;
      } else if (m.score != null) {
        accs.push(m.score / MODULE_QUESTION_COUNT[id]);
        sampleQuestions += MODULE_QUESTION_COUNT[id];
      }
      if (m.secondsPerQuestion != null) speeds.push(m.secondsPerQuestion);
    }

    if (accs.length === 0) {
      // F0067 冷启动：宽区间 + null 点估计
      return {
        id,
        accuracy: null,
        accuracyLow: null,
        accuracyHigh: null,
        secondsPerQuestion: null,
        sampleQuestions: 0,
      };
    }

    const mean = accs.reduce((s, v) => s + v, 0) / accs.length;
    // F0068：n>=2 用个人历史；n===1 仍为冷启动宽区间
    let low: number;
    let high: number;
    if (accs.length >= 2) {
      const sd = Math.sqrt(
        accs.reduce((s, v) => s + (v - mean) ** 2, 0) / (accs.length - 1),
      );
      const ci = 1.96 * (sd / Math.sqrt(accs.length));
      low = clamp01(mean - ci);
      high = clamp01(mean + ci);
    } else {
      low = clamp01(mean - 0.2);
      high = clamp01(mean + 0.2);
    }
    const speed =
      speeds.length > 0
        ? Math.round(speeds.reduce((s, v) => s + v, 0) / speeds.length)
        : null;
    return {
      id,
      accuracy: round4(mean),
      accuracyLow: round4(low),
      accuracyHigh: round4(high),
      secondsPerQuestion: speed,
      sampleQuestions,
    };
  });

  const totalSamples = modules.reduce((s, m) => s + m.sampleQuestions, 0);
  const examCount = imports.length;
  // F0069 数据量与可信等级
  const confidence: BaselineSnapshot["confidence"] =
    examCount >= 4 && totalSamples >= 200
      ? "高"
      : examCount >= 2
        ? "中"
        : examCount === 1
          ? "低"
          : "冷启动";
  const dataNote =
    confidence === "冷启动"
      ? "还没有成绩数据。上传 1 次模考截图或手工录入后，这里会建立第一版个人基线。"
      : confidence === "低"
        ? "目前只基于 1 次模考，区间较宽；再导入 1 次后区间会明显收窄。"
        : `基于最近 ${examCount} 次模考、${totalSamples} 道题。`;

  return { computedAt: now.toISOString(), modules, confidence, dataNote };
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const round4 = (n: number): number => Math.round(n * 10000) / 10000;
