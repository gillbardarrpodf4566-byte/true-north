import { describe, expect, it } from "vitest";
import { buildTrainingSet, seedQuestions } from "./seed";

describe("难度自适应真实影响选题（F0107）", () => {
  it("指定难度且题量足够时只取该难度的题", () => {
    const pool = seedQuestions("言语理解");
    const target = ([1, 2, 3] as const).find((level) => pool.filter((q) => q.difficulty === level).length >= 3);
    expect(target).toBeDefined();
    const set = buildTrainingSet("言语理解", 3, 0, target);
    expect(set).toHaveLength(3);
    expect(set.every((q) => q.difficulty === target)).toBe(true);
  });

  it("该难度题量不足时回落全量池，不靠重复同一题凑数", () => {
    const pool = seedQuestions("资料分析");
    const counts = ([1, 2, 3] as const).map((level) => ({ level, n: pool.filter((q) => q.difficulty === level).length }));
    const scarce = counts.sort((a, b) => a.n - b.n)[0]!;
    const requested = scarce.n + 2;
    const set = buildTrainingSet("资料分析", requested, 0, scarce.level);
    expect(set.length).toBe(Math.min(requested, pool.length));
    expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
  });

  it("不指定难度时行为与原先一致", () => {
    expect(buildTrainingSet("判断推理", 4, 0).map((q) => q.id)).toEqual(buildTrainingSet("判断推理", 4, 0, undefined).map((q) => q.id));
  });
});
