import { describe, expect, it } from "vitest";
import { clusterFailures, degradationPlan, featureEnabledFor, isFlagEnabled, resolveFeatureFlags, runEssayEval, DEFAULT_FLAGS } from "./quality";

describe("申论评测集与 Rubric Grader（F0374/F0376）", () => {
  const outcome = runEssayEval();

  it("产出用例结果且门禁判定存在", () => {
    expect(outcome.results.length).toBeGreaterThanOrEqual(20);
    expect(["通过", "拦截"]).toContain(outcome.gateVerdict);
  });

  it("确定性：两次运行结果一致", () => {
    const again = runEssayEval();
    expect(again.passRate).toBe(outcome.passRate);
    expect(again.failures).toEqual(outcome.failures);
  });

  it("好答案用例应全部通过 Grader（失败集为空或仅弱答案低分项）", () => {
    const goodOnly = outcome.results.filter((r) => !r.label.includes("失") || r.pass);
    expect(goodOnly.every((r) => r.pass || r.label.includes("漏点"))).toBe(true);
  });
});

describe("失败聚类（F0381）", () => {
  it("按类聚合计数并排序", () => {
    const c = clusterFailures([
      { category: "解析错误", text: "分数识别成题数" },
      { category: "解析错误", text: "模块漏识" },
      { category: "幻觉", text: "编造了不存在的要点" },
      { category: "奇怪输入", text: "无法归类" },
    ]);
    expect(c[0]!.cluster).toBe("解析错误");
    expect(c[0]!.count).toBe(2);
    expect(c.find((x) => x.cluster === "其他")!.count).toBe(1);
  });
});

describe("降级策略（F0388）", () => {
  it("高价值能力降级到规则流程；对话直接暂停", () => {
    const parse = degradationPlan("parse", { primaryFailed: true, overBudget: false });
    expect(parse.fallback).toBe("规则流程");
    const coach = degradationPlan("coach", { primaryFailed: true, overBudget: false });
    expect(coach.allowed).toBe(false);
    const essay = degradationPlan("essay", { primaryFailed: false, overBudget: true });
    expect(essay.note).toContain("置信度固定为「低」");
    const normal = degradationPlan("diagnose", { primaryFailed: false, overBudget: false });
    expect(normal.fallback).toBeNull();
  });
});

describe("灰度开关（F0359）", () => {
  it("all/none 直接生效；percent 对同一用户稳定", () => {
    const all = DEFAULT_FLAGS.find((f) => f.key === "essay_coach")!;
    const none: (typeof DEFAULT_FLAGS)[number] = { ...all, rollout: "none" };
    expect(isFlagEnabled(all, "user-1")).toBe(true);
    expect(isFlagEnabled(none, "user-1")).toBe(false);

    const pct = DEFAULT_FLAGS.find((f) => f.key === "score_forecast")!;
    const a = isFlagEnabled(pct, "user-42");
    for (let i = 0; i < 5; i++) {
      expect(isFlagEnabled(pct, "user-42")).toBe(a);
    }
  });

  it("后台配置只覆盖已知键，漏写/非法值回退默认且服务端可执行判定", () => {
    const flags = resolveFeatureFlags([{ key: "essay_coach", rollout: "percent", percent: 101 }, { key: "unknown", rollout: "none", percent: 0 }]);
    expect(flags.find((flag) => flag.key === "essay_coach")).toMatchObject({ rollout: "percent", percent: 100 });
    expect(flags.find((flag) => flag.key === "job_selection")).toMatchObject({ rollout: "all", percent: 100 });
    expect(featureEnabledFor([{ key: "job_selection", rollout: "none", percent: 0 }], "job_selection", "user:1")).toBe(false);
  });
});
