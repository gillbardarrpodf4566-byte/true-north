import { describe, expect, it } from "vitest";
import { recordRetest, remediationTaskFor, retestAvailableIn, RETEST_INTERVAL_HOURS } from "./engine";
import { questionById } from "@/lib/questions/seed";
import type { WrongBookEntry } from "./engine";

const entry = (): WrongBookEntry => ({
  questionId: "fa-0",
  moduleId: "资料分析",
  addedAt: "2026-08-20T10:00:00.000Z",
  status: "验证中",
  suggested: { cause: "计算错误", confidence: "中", evidence: "干扰项为量级错误", needsUserConfirm: false },
  confirmedCause: "计算错误",
  retestLog: [],
});

describe("复测间隔门控（F0163）", () => {
  it("间隔内连续两次答对只停留在验证中，不算已修复", () => {
    const first = recordRetest(entry(), true, new Date("2026-08-21T10:00:00.000Z"));
    expect(first.status).toBe("验证中");
    const second = recordRetest(first, true, new Date("2026-08-21T11:00:00.000Z"));
    expect(second.status).toBe("验证中");
  });

  it("跨过最小间隔后的第二次答对才判已修复", () => {
    const first = recordRetest(entry(), true, new Date("2026-08-21T10:00:00.000Z"));
    const spaced = new Date(new Date("2026-08-21T10:00:00.000Z").getTime() + (RETEST_INTERVAL_HOURS + 1) * 3_600_000);
    expect(recordRetest(first, true, spaced).status).toBe("已修复");
  });

  it("答错立即回到复发，与间隔无关", () => {
    const first = recordRetest(entry(), true, new Date("2026-08-21T10:00:00.000Z"));
    expect(recordRetest(first, false, new Date("2026-08-23T10:00:00.000Z")).status).toBe("复发");
  });

  it("剩余等待小时数：首次可立即复测，刚测过则需等待", () => {
    expect(retestAvailableIn(entry())).toBeNull();
    const first = recordRetest(entry(), true, new Date("2026-08-21T10:00:00.000Z"));
    expect(retestAvailableIn(first, new Date("2026-08-21T12:00:00.000Z"))).toBeGreaterThan(0);
    expect(retestAvailableIn(first, new Date("2026-08-23T10:00:00.000Z"))).toBeNull();
  });
});

describe("修复建议为可执行任务（F0161）", () => {
  it("按错因给出 5–15 分钟任务、成功判据与复测入口", () => {
    const question = questionById("fa-0")!;
    const task = remediationTaskFor(entry(), question);
    expect(task.minutes).toBeGreaterThanOrEqual(5);
    expect(task.minutes).toBeLessThanOrEqual(15);
    expect(task.successCriteria.length).toBeGreaterThan(0);
    expect(task.href).toContain("/train/session/retest-");
  });

  it("错因未确认时也给出兜底任务，不返回空", () => {
    const question = questionById("fa-0")!;
    const unknown = remediationTaskFor({ ...entry(), confirmedCause: null, suggested: null }, question);
    expect(unknown.minutes).toBeGreaterThanOrEqual(5);
    expect(unknown.title).not.toBe("");
  });
});
