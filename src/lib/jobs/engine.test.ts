import { describe, expect, it } from "vitest";
import { checkRequirements, easyCandidates, matchPositions, SEED_POSITIONS } from "./engine";
import type { JobSeekerProfile } from "./types";

const profile: JobSeekerProfile = {
  education: "本科",
  major: "计算机科学与技术",
  isFreshGraduate: false,
  politicalStatus: "中共党员",
  grassrootsYears: 0,
  preferences: { region: "广州市" },
  updatedAt: "2026-08-31",
};

describe("确定性资格引擎（F0259/F0260/F0261）", () => {
  it("本科计算机党员 → 税务局可报（同义匹配备注）；市委办（要求硕士+基层）不可报", () => {
    const ms = matchPositions(SEED_POSITIONS, profile);
    const tax = ms.find((m) => m.position.id === "job-001")!;
    expect(tax.verdict).toBe("可报");
    expect(tax.checks.find((c) => c.field === "专业")!.needsConfirm).toBe(true);

    const office = ms.find((m) => m.position.id === "job-004")!;
    expect(office.verdict).toBe("不可报");
    const eduFail = office.checks.find((c) => c.field === "学历")!;
    expect(eduFail.pass).toBe(false);
    expect(eduFail.reason).toContain("硕士");
  });

  it("不可报原因逐条展示（F0260）", () => {
    const street = matchPositions(SEED_POSITIONS, profile).find(
      (m) => m.position.id === "job-003",
    )!;
    expect(street.verdict).toBe("不可报");
    const grassFail = street.checks.find((c) => c.field === "基层经历")!;
    expect(grassFail.pass).toBe(false);
    expect(grassFail.reason).toContain("基层");
  });

  it("专业同义匹配 → 可报但带人工复核备注（F0261）", () => {
    const statsProfile: JobSeekerProfile = { ...profile, major: "应用统计学" };
    const ms = matchPositions(SEED_POSITIONS, statsProfile);
    const bigdata = ms.find((m) => m.position.id === "job-006")!;
    expect(bigdata.verdict).toBe("可报");
    const majorCheck = bigdata.checks.find((c) => c.field === "专业")!;
    expect(majorCheck.needsConfirm).toBe(true);
    expect(majorCheck.reason).toContain("同义");
  });

  it("应届-only 岗位对非应届不可报（F0260）", () => {
    const ms = matchPositions(SEED_POSITIONS, profile);
    const stats = ms.find((m) => m.position.id === "job-002")!;
    expect(stats.verdict).toBe("不可报");
    expect(stats.checks.find((c) => c.field === "应届")!.reason).toContain("应届");
  });

  it("应届 + 统计学 → 统计局可报", () => {
    const fresh: JobSeekerProfile = {
      ...profile,
      major: "统计学",
      isFreshGraduate: true,
      politicalStatus: "群众",
      preferences: {},
    };
    const ms = matchPositions(SEED_POSITIONS, fresh);
    expect(ms.find((m) => m.position.id === "job-002")!.verdict).toBe("可报");
  });
});

describe("软排序与分组（F0262–F0265/F0270）", () => {
  const ms = matchPositions(SEED_POSITIONS, { ...profile, preferences: {} });

  it("不可报排最后；可报内部按 稳>保>冲 排序（F0264）", () => {
    const firstNonMatch = ms.findIndex((m) => m.verdict !== "不可报");
    const lastMatch = ms.map((m) => m.verdict).lastIndexOf("不可报");
    if (lastMatch >= 0) expect(firstNonMatch).toBeLessThan(lastMatch);
    const reportable = ms.filter((m) => m.verdict === "可报");
    const tiers = reportable.map((m) => m.tier);
    const order = { 稳: 0, 保: 1, 冲: 2 };
    const ranks = tiers.map((t) => order[t as keyof typeof order] ?? 3);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it("每个可报职位都有匹配理由与数据来源（F0265/F0270）", () => {
    for (const m of ms.filter((x) => x.verdict !== "不可报")) {
      expect(m.reasons.length).toBeGreaterThan(0);
      expect(m.position.source.name).toContain("官方");
      expect(m.position.source.updatedAt).not.toBe("");
    }
  });

  it("易上岸候选 = 竞争比最低前三（F0263）", () => {
    const easy = easyCandidates(ms);
    expect(easy.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < easy.length; i++) {
      expect(easy[i]!.competitionRatio!).toBeGreaterThanOrEqual(easy[i - 1]!.competitionRatio!);
    }
  });
});
