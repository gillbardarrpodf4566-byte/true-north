import { describe, expect, it } from "vitest";
import { canonicalJson, externalImportDigest } from "./external-imports";

describe("外部导入幂等指纹（F0039/F0048）", () => {
  it("对象字段顺序与记录顺序不同仍得到同一语义摘要", () => {
    const left = [{ date: "2026-08-20", modules: [{ id: "资料分析", correct: 16 }] }, { date: "2026-08-21", modules: [{ id: "言语理解", correct: 12 }] }];
    const right = [{ modules: [{ correct: 12, id: "言语理解" }], date: "2026-08-21" }, { modules: [{ correct: 16, id: "资料分析" }], date: "2026-08-20" }];
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(externalImportDigest(left)).toBe(externalImportDigest(right));
  });

  it("内容变化会得到新的摘要，要求显式作为新导入处理", () => {
    expect(externalImportDigest([{ score: 120 }])).not.toBe(externalImportDigest([{ score: 121 }]));
  });
});
