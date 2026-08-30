/**
 * 数据质量校验（数据接入与建档：F0045 异常值检测 / F0046 跨字段一致性）。
 * 校验不阻断入库，但异常字段必须由用户显式确认（异常值要求确认）。
 */
import { MODULE_FULL_SCORE, type ModuleId } from "@/lib/profile/types";
import type { ParsedModuleScore } from "@/lib/ai/gateway";

export interface FieldIssue {
  fieldKey: string;
  message: string;
}

/** 合理区间：正确率 0–1；用时 15–180 秒/题；分数 0–满分 */
export function checkModule(m: ParsedModuleScore): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const full = MODULE_FULL_SCORE[m.id as ModuleId];
  if (m.score != null && (m.score < 0 || m.score > full)) {
    issues.push({ fieldKey: `module:${m.id}:score`, message: `分数超出 0–${full} 合理区间` });
  }
  if (m.secondsPerQuestion != null && (m.secondsPerQuestion < 15 || m.secondsPerQuestion > 180)) {
    issues.push({
      fieldKey: `module:${m.id}:seconds`,
      message: "每题用时超出 15–180 秒合理区间",
    });
  }
  // F0046 一致性：correct/count 与 score/full 偏差 > 0.05 视为不一致
  if (m.correct != null && m.questions != null && m.questions > 0 && m.score != null && full > 0) {
    const byAccuracy = m.correct / m.questions;
    const byScore = m.score / full;
    if (Math.abs(byAccuracy - byScore) > 0.05) {
      issues.push({
        fieldKey: `module:${m.id}:correct`,
        message: "正确数/题数与得分占比不一致，请核对",
      });
    }
  }
  return issues;
}

export function checkAll(modules: ParsedModuleScore[]): FieldIssue[] {
  return modules.flatMap(checkModule);
}
