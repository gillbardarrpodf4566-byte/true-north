import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { trainingMachine, timeExceeded } from "./machine";
import { suggestErrorCause, confirmCause, recordRetest, remediationFor } from "@/lib/errorcause/engine";
import { questionById } from "@/lib/questions/seed";
import type { Question } from "@/lib/questions/types";
import type { WrongBookEntry as Entry } from "@/lib/errorcause/engine";

function actor() {
  return createActor(trainingMachine).start();
}

describe("训练任务状态机（xlsx 训练任务行）", () => {
  it("待开始→进行中→已完成→已反馈", () => {
    const a = actor();
    expect(a.getSnapshot().value).toBe("待开始");
    a.send({ type: "START", startedAt: "2026-08-30" });
    expect(a.getSnapshot().value).toBe("进行中");
    a.send({ type: "ANSWER", questionId: "q1", choice: 2, seconds: 40, skipped: false });
    expect(a.getSnapshot().context.answers["q1"]).toEqual({
      choice: 2,
      seconds: 40,
      skipped: false,
    });
    a.send({ type: "FINISH", totalTime: 600 });
    expect(a.getSnapshot().value).toBe("已完成");
    a.send({ type: "FEEDBACK_SHOWN" });
    expect(a.getSnapshot().value).toBe("已反馈");
  });

  it("暂停⇄恢复，且已作答不丢（禁止中断后丢失已作答）", () => {
    const a = actor();
    a.send({ type: "START", startedAt: "x" });
    a.send({ type: "ANSWER", questionId: "q1", choice: 1, seconds: 10, skipped: false });
    a.send({ type: "PAUSE" });
    expect(a.getSnapshot().value).toBe("暂停");
    a.send({ type: "RESUME" });
    expect(a.getSnapshot().context.answers["q1"]).toBeDefined();
  });

  it("反馈失败可重试（禁止因反馈失败丢训练数据）", () => {
    const a = actor();
    a.send({ type: "START", startedAt: "x" });
    a.send({ type: "FINISH", totalTime: 100 });
    a.send({ type: "RETRY_FEEDBACK" });
    expect(a.getSnapshot().value).toBe("已反馈");
  });

  it("超预算检测（禁止超预算仍强制执行——由 UI 呈现）", () => {
    expect(timeExceeded(46, 45)).toBe(true);
    expect(timeExceeded(44, 45)).toBe(false);
  });
});

describe("错因引擎（F0149–F0157，禁止默认归因粗心）", () => {
  it("干扰项绑定错因 → 高置信建议", () => {
    const q = questionById("fa-0")!;
    const wrongOption = (q.answerIndex + 1) % q.options.length;
    const sug = suggestErrorCause(q, wrongOption, 60);
    expect(sug.cause).not.toBeNull();
    expect(sug.confidence).toBe("高");
    expect(sug.needsUserConfirm).toBe(false);
  });

  it("无绑定低用时 → 低置信审题假设，必须用户确认", () => {
    const q: Question = {
      id: "test-unbound",
      moduleId: "言语理解",
      type: "片段阅读",
      difficulty: 2,
      knowledgePoint: "主旨概括",
      realExam: null,
      stem: "测试题干",
      options: ["A 项", "B 项", "C 项", "D 项"],
      answerIndex: 0,
      explanation: "",
      errorCauseByOption: {}, // 无绑定：只能靠用时轨迹推断
      skillTarget: "测试",
    };
    const sug = suggestErrorCause(q, 1, 5);
    expect(sug.needsUserConfirm).toBe(true);
    expect(sug.confidence).toBe("低");
    expect(sug.evidence).toContain("秒");
  });

  it("无绑定正常用时 → 证据不足，不强行归因（禁止默认归因粗心）", () => {
    const q: Question = {
      id: "test-unbound-2",
      moduleId: "言语理解",
      type: "片段阅读",
      difficulty: 2,
      knowledgePoint: "主旨概括",
      realExam: null,
      stem: "测试题干",
      options: ["A 项", "B 项", "C 项", "D 项"],
      answerIndex: 0,
      explanation: "",
      errorCauseByOption: {},
      skillTarget: "测试",
    };
    const sug = suggestErrorCause(q, 2, 60);
    expect(sug.cause).toBeNull();
    expect(sug.needsUserConfirm).toBe(true);
  });

  it("确认错因 → 验证中；复测连对 2 次才修复（禁止一次答对即判永久掌握）", () => {
    const q = questionById("fa-1")!;
    const entry: Entry = {
      questionId: q.id,
      moduleId: q.moduleId,
      addedAt: "2026-08-30",
      status: "待确认",
      suggested: { cause: "计算错误", confidence: "高", evidence: "", needsUserConfirm: false },
      confirmedCause: null,
      retestLog: [],
    };
    const confirmed = confirmCause(entry, "计算错误");
    expect(confirmed.status).toBe("验证中");
    const once = recordRetest(confirmed, true);
    expect(once.status).toBe("验证中");
    const twice = recordRetest(once, true);
    expect(twice.status).toBe("已修复");
    const relapsed = recordRetest(confirmed, false);
    expect(relapsed.status).toBe("复发");
  });

  it("修复建议按错因给出且不为空", () => {
    const q: Question = questionById("fa-2")!;
    const entry: Entry = {
      questionId: q.id,
      moduleId: q.moduleId,
      addedAt: "",
      status: "验证中",
      suggested: null,
      confirmedCause: "定位错误",
      retestLog: [],
    };
    expect(remediationFor(entry, q)).toContain("定位");
  });
});
