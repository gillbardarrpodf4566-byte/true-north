import { describe, expect, it } from "vitest";
import { redactFeedback } from "./feedbackRedaction";

describe("AI 反馈候选脱敏（F0380）", () => {
  it("屏蔽手机号、邮箱、身份证、密钥和 URL 查询令牌", () => {
    const raw = "张三手机 13800138000，邮箱 user@example.com，证件 110101199001011234，Bearer sk-abcdefghijklmnopqrstuvwxyz，https://x.test/a?token=secret-value";
    const result = redactFeedback(raw);
    expect(result.sanitizedExcerpt).not.toContain("13800138000");
    expect(result.sanitizedExcerpt).not.toContain("user@example.com");
    expect(result.sanitizedExcerpt).not.toContain("110101199001011234");
    expect(result.sanitizedExcerpt).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(result.sanitizedExcerpt).not.toContain("token=secret-value");
    expect(result.piiCategories).toEqual(expect.arrayContaining(["手机号", "邮箱", "身份证", "密钥", "URL令牌"]));
    expect(result.status).toBe("redacted");
  });

  it("无敏感信息时保留可用于聚类的最小摘录", () => {
    const result = redactFeedback("资料分析页面的解析字段与材料不一致，需要复查。");
    expect(result.sanitizedExcerpt).toContain("资料分析页面");
    expect(result.piiCategories).toEqual([]);
    expect(result.status).toBe("clean");
  });
});
