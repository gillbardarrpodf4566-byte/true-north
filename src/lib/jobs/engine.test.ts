import { describe, expect, it } from "vitest";
import { easyCandidates, matchPositions, SEED_POSITIONS } from "./engine";
import { DEFAULT_RULE_SET } from "./rules";
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
      expect(m.position.source.name.trim().length).toBeGreaterThan(0);
      expect(m.position.source.updatedAt).not.toBe("");
    }
  });

  it("演示种子职位必须标注为模拟来源，不得冒充官方公告，且更新时间不在未来", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const position of SEED_POSITIONS) {
      expect(position.source.origin).toBe("simulated");
      // 模拟数据必须自我声明为演示用，且不得出现会被读成官方发布的措辞
      expect(position.source.name).toContain("演示用");
      expect(position.source.name).not.toContain("（官方）");
      expect(position.source.updatedAt <= today).toBe(true);
    }
  });

  it("发布的基层经历规则会影响资格判断，并把版本带回结果", () => {
    const rules = { ...DEFAULT_RULE_SET, grassrootsYearsWhenRequired: 0 };
    const results = matchPositions(SEED_POSITIONS, profile, { rules, ruleRevision: 7 });
    const street = results.find((item) => item.position.id === "job-003")!;
    expect(street.verdict).toBe("可报");
    expect(street.ruleRevision).toBe(7);
  });

  it("意向地区与单位层级参与可解释排序，缺少通勤/发展来源时明确不计分", () => {
    const results = matchPositions(SEED_POSITIONS, {
      ...profile,
      preferences: { region: "广州市", unitLevel: "市级", commute: "同区优先", developmentPriorities: ["稳定性"], riskAppetite: "稳妥" },
    });
    const tax = results.find((item) => item.position.id === "job-001")!;
    expect(tax.preferenceScore).toBeGreaterThan(0);
    expect(tax.unavailableFactors).toEqual(expect.arrayContaining([expect.stringContaining("通勤"), expect.stringContaining("发展偏好")]));
  });

  it("易上岸候选 = 竞争比最低前三（F0263）", () => {
    const easy = easyCandidates(ms);
    expect(easy.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < easy.length; i++) {
      expect(easy[i]!.competitionRatio!).toBeGreaterThanOrEqual(easy[i - 1]!.competitionRatio!);
    }
  });
});
