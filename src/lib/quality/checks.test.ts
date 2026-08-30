import { describe, expect, it } from "vitest";
import { checkModule } from "./checks";

describe("数据质量校验（F0045/F0046）", () => {
  it("分数超出模块满分 → 异常", () => {
    const issues = checkModule({
      id: "资料分析",
      score: 25,
      questions: 20,
      correct: 14,
      secondsPerQuestion: 60,
    });
    expect(issues.some((i) => i.fieldKey === "module:资料分析:score")).toBe(true);
  });

  it("用时超出 15–180 秒 → 异常", () => {
    const issues = checkModule({
      id: "言语理解",
      score: 30,
      questions: 40,
      correct: 30,
      secondsPerQuestion: 300,
    });
    expect(issues.some((i) => i.fieldKey === "module:言语理解:seconds")).toBe(true);
  });

  it("正确数/题数与得分占比不一致 → 异常（F0046）", () => {
    const issues = checkModule({
      id: "资料分析",
      score: 18,
      questions: 20,
      correct: 5,
      secondsPerQuestion: 60,
    });
    expect(issues.some((i) => i.fieldKey === "module:资料分析:correct")).toBe(true);
  });

  it("正常数据无异常", () => {
    expect(
      checkModule({ id: "资料分析", score: 14, questions: 20, correct: 14, secondsPerQuestion: 60 }),
    ).toHaveLength(0);
  });
});
