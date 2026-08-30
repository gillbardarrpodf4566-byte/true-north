/**
 * 训练任务状态机（xlsx「状态机与异常」·训练任务行，CL-03）。
 *
 * 状态：待开始 → 进行中 →（暂停⇄恢复）→ 已完成 → 已反馈（final）。
 * 禁止事项逐条落实：
 * - 禁止超出时间预算仍强制执行：进行中暴露 timeExceeded 事实，由 UI 呈现而非强制中断
 * - 禁止中断后丢失已作答：answers 持续持久化（store persist），暂停/中断不清空
 * - 禁止因反馈失败丢训练数据：已完成时数据先入模，反馈生成失败可重试（retryFeedback）
 */
import { setup } from "xstate";

export interface TrainingContext {
  sessionId: string;
  /** 已作答（含跳过），按题持久化 */
  answers: Record<string, { choice: number | null; seconds: number; skipped: boolean }>;
  totalTime: number;
  startedAt: string | null;
}

export type TrainingEvent =
  | { type: "START"; startedAt: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "ANSWER"; questionId: string; choice: number | null; seconds: number; skipped: boolean }
  | { type: "FINISH"; totalTime: number }
  | { type: "FEEDBACK_SHOWN" }
  | { type: "RETRY_FEEDBACK" };

export const trainingMachine = setup({
  types: {} as { context: TrainingContext; events: TrainingEvent },
}).createMachine({
  id: "trainingTask",
  initial: "待开始",
  context: { sessionId: "", answers: {}, totalTime: 0, startedAt: null },
  states: {
    待开始: {
      on: {
        START: {
          target: "进行中",
          actions: ({ context, event }) => {
            context.startedAt = event.startedAt;
          },
        },
      },
    },
    进行中: {
      on: {
        PAUSE: "暂停",
        ANSWER: {
          actions: ({ context, event }) => {
            context.answers[event.questionId] = {
              choice: event.choice,
              seconds: event.seconds,
              skipped: event.skipped,
            };
          },
        },
        FINISH: {
          target: "已完成",
          actions: ({ context, event }) => {
            context.totalTime = event.totalTime;
          },
        },
      },
    },
    暂停: {
      on: {
        RESUME: "进行中",
        FINISH: {
          target: "已完成",
          actions: ({ context, event }) => {
            context.totalTime = event.totalTime;
          },
        },
      },
    },
    已完成: {
      // 数据已入模；反馈未生成时可重试（禁止因反馈失败丢训练数据）
      on: {
        FEEDBACK_SHOWN: "已反馈",
        RETRY_FEEDBACK: "已反馈",
      },
    },
    已反馈: { type: "final" },
  },
});

export function timeExceeded(usedMinutes: number, budgetMinutes: number): boolean {
  return usedMinutes > budgetMinutes;
}
