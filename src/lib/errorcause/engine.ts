/**
 * 错因诊断引擎（错题与错因系统 F0149/F0151–F0157，CL-03 step3–5）。
 *
 * xlsx 状态机铁律：
 * - 禁止默认归因「粗心」——错因只能来自作答轨迹证据
 * - 低置信必须请用户确认（F0157），确认后进入验证中
 * - 禁止一次答对即判永久掌握（验证中→已修复需近邻题+复测链路）
 * - 禁止不可见黑箱修改用户画像：所有建议带证据，用户可拒绝
 */
import type { ErrorCause, Question } from "@/lib/questions/types";

export interface ErrorCauseSuggestion {
  cause: ErrorCause | null;
  confidence: "高" | "中" | "低";
  evidence: string;
  /** 低置信或无证据时，需要用户确认/自选 */
  needsUserConfirm: boolean;
}

export type ErrorCauseStatus = "待判断" | "待确认" | "验证中" | "已修复" | "复发";

export interface WrongBookEntry {
  questionId: string;
  moduleId: string;
  addedAt: string;
  status: ErrorCauseStatus;
  suggested: ErrorCauseSuggestion | null;
  /** 用户确认或自选的错因 */
  confirmedCause: ErrorCause | null;
  /** 复测记录（近邻题/延迟复测） */
  retestLog: Array<{ at: string; correct: boolean }>;
}

/** AI 错因建议：基于「选中的干扰项绑定的错因 + 用时轨迹」推断 */
export function suggestErrorCause(q: Question, choice: number, seconds: number): ErrorCauseSuggestion {
  const bound = q.errorCauseByOption[choice];
  if (bound) {
    // 干扰项本身绑定了错因 → 证据明确
    return {
      cause: bound,
      confidence: "高",
      evidence: `你选择了「${q.options[choice]}」，这个选项通常来自「${bound}」。用时 ${seconds} 秒。`,
      needsUserConfirm: false,
    };
  }
  // 无绑定：按用时线索推断
  const expected = q.difficulty * 25;
  if (seconds < expected * 0.5) {
    return {
      cause: "审题错误",
      confidence: "低",
      evidence: `用时仅 ${seconds} 秒，明显快于该难度题的正常节奏（约 ${expected} 秒），很可能漏看了条件。`,
      needsUserConfirm: true,
    };
  }
  return {
    cause: null,
    confidence: "低",
    evidence: "作答轨迹的证据不足，无法可靠判断错因。",
    needsUserConfirm: true,
  };
}

/** 状态迁移（xlsx 错因状态机） */
export function confirmCause(entry: WrongBookEntry, cause: ErrorCause): WrongBookEntry {
  return { ...entry, confirmedCause: cause, status: "验证中" };
}

/** 近邻题/延迟复测：答对累计 2 次才算修复（禁止一次答对即判永久掌握） */
export function recordRetest(entry: WrongBookEntry, correct: boolean, at = new Date()): WrongBookEntry {
  const next: WrongBookEntry = {
    ...entry,
    retestLog: [...entry.retestLog, { at: at.toISOString(), correct }],
  };
  const recent = next.retestLog.slice(-2);
  if (recent.length >= 2 && recent.every((r) => r.correct)) {
    next.status = "已修复";
  } else if (correct) {
    next.status = "验证中";
  } else {
    next.status = "复发";
  }
  return next;
}

/** 修复建议（CL-03 step4 微型干预） */
export function remediationFor(entry: WrongBookEntry, q: Question): string {
  const cause = entry.confirmedCause ?? entry.suggested?.cause;
  switch (cause) {
    case "知识缺口":
      return `先看方法卡「${q.knowledgePoint}」，再做 3 道近邻题验证。`;
    case "策略选择错误":
      return `这道题应该换一条更短的路径：${q.explanation.split("。")[0]}。再做 2 道同方法题巩固。`;
    case "审题错误":
      return "下次作答前先圈出问题词与限定条件，再读材料。做 2 道同型题练习定位。";
    case "计算错误":
      return "保留估算习惯：先估量级再精算。用 3 道同公式题做限时验算。";
    case "定位错误":
      return "先读问题再回材料定位。练 3 道图表定位题，目标 20 秒内锁定数据行。";
    default:
      return "先重做原题，再判断卡在哪一步。";
  }
}
