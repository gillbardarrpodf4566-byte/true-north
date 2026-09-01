import { describe, expect, it } from "vitest";
import { buildExamNodeNotifications, buildReviewNotifications, progressNotification, shouldNotify, trainingAccuracyProgress } from "./engine";

describe("主动支持与通知策略（F0291–F0299）", () => {
  const base = { enabled: true, task: true, exam: true, review: true, progress: true, quietHours: { start: 23, end: 7 }, ignoredStreak: 0 };
  it("考试节点与复习到期只生成近期有行动价值的提醒", () => {
    const now = new Date("2026-08-31T10:00:00");
    expect(buildExamNodeNotifications([{ id: 1, exam_name: "国考", kind: "报名", date: "2026-09-05" }, { id: 2, exam_name: "国考", kind: "笔试", date: "2027-01-01" }], now)).toHaveLength(1);
    expect(buildReviewNotifications([{ knowledgePoint: "增长率", reason: "到期" }], now)[0]!.actionHref).toBe("/train/wrongbook");
  });
  it("关闭/免打扰/连续忽略会阻断提醒", () => {
    const now = new Date("2026-08-31T02:00:00");
    expect(shouldNotify({ ...base, enabled: false }, "任务", now).allowed).toBe(false);
    expect(shouldNotify(base, "任务", now).allowed).toBe(false);
    expect(shouldNotify({ ...base, ignoredStreak: 7 }, "任务", new Date("2026-08-31T10:00:00")).allowed).toBe(false);
  });
  it("进步提醒必须有正向真实变化", () => {
    expect(progressNotification(0, "正确率")).toBeNull();
    expect(progressNotification(6, "正确率")!.body).toContain("6");
  });

  it("只完成任务、没有足够的真实作答记录时不生成进步消息", () => {
    const attempts = Array.from({ length: 9 }, (_, index) => ({
      moduleId: "资料分析",
      questionType: "增长率",
      knowledgePoint: "增长率",
      correct: index >= 4,
      seconds: 40,
      answerChanges: 0,
      at: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    expect(trainingAccuracyProgress(attempts)).toBeNull();
  });

  it("仅在近期题级正确率高于个人早期记录时生成可量化增量", () => {
    const attempts = Array.from({ length: 10 }, (_, index) => ({
      moduleId: "资料分析",
      questionType: "增长率",
      knowledgePoint: "增长率",
      correct: index >= 5,
      seconds: 40,
      answerChanges: 0,
      at: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    expect(trainingAccuracyProgress(attempts)).toEqual({ delta: 100, metric: "近 5 题正确率" });
  });
});
