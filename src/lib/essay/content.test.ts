import { describe, expect, it } from "vitest";
import { diffBundles, seedBundles, validateEssayBundle } from "./content";

describe("申论完整内容包（F0344–F0347）", () => {
  it("种子题可形成完整并可发布的内容包", () => {
    const bundle = seedBundles()[0]!;
    expect(validateEssayBundle(bundle)).toEqual(expect.objectContaining({ ok: true }));
  });

  it("缺少评分点、材料或范例会被拒绝", () => {
    const bundle = structuredClone(seedBundles()[0]!);
    bundle.question.scorePoints = [];
    bundle.question.materials = [];
    bundle.examples = [];
    const result = validateEssayBundle(bundle);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toMatch(/materials|scorePoints|examples/);
  });

  it("版本对比可明确显示评分点变化", () => {
    const before = seedBundles()[0]!;
    const after = structuredClone(before);
    after.question.scorePoints[0]!.points += 1;
    const diff = diffBundles(before, after);
    expect(diff.find((item) => item.field === "得分点")?.changed).toBe(true);
  });
});
