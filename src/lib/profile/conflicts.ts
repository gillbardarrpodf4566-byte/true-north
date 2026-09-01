/** V1 目标冲突检测（F0029）：考试日期、目标分与可用时间之间的可解释提示。 */
export interface GoalConflict {
  kind: "日期" | "时间" | "目标分";
  severity: "提示" | "需要确认";
  message: string;
  action: string;
}

export function checkGoalConflicts(input: {
  examDate: string;
  targetTotal: number;
  weekdayMinutes: number;
  weekendMinutes: number;
  currentScore?: number | null;
  today?: Date;
}): GoalConflict[] {
  const now = input.today ?? new Date();
  const days = Math.ceil((new Date(input.examDate).getTime() - now.getTime()) / 86_400_000);
  const perDay = (input.weekdayMinutes * 5 + input.weekendMinutes * 2) / 7;
  const out: GoalConflict[] = [];
  if (!Number.isFinite(days) || days < 0) {
    out.push({ kind: "日期", severity: "需要确认", message: "考试日期已经过去，请核对目标批次。", action: "修改考试日期" });
  } else if (days <= 30 && perDay < 60) {
    out.push({ kind: "时间", severity: "需要确认", message: `距离考试仅 ${days} 天，但平均每天可学习 ${Math.round(perDay)} 分钟。`, action: "增加时间或降低目标" });
  }
  if (input.currentScore != null && input.targetTotal - input.currentScore > 35 && days < 90) {
    out.push({ kind: "目标分", severity: "提示", message: `目标比当前水平高 ${Math.round(input.targetTotal - input.currentScore)} 分，建议拆成阶段目标。`, action: "查看阶段路线图" });
  }
  return out;
}
