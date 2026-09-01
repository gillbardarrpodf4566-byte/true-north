import { describe, expect, it } from "vitest";
import { buildReviewNotifications, renderTemplate } from "./engine";

describe("消息模板（F0357）", () => {
  it("后台模板生效并替换占位符", () => {
    const text = renderTemplate([{ kind: "复习到期", template: "{knowledgePoint} 该复测了" }], "复习到期", { knowledgePoint: "增长率" }, "内置文案");
    expect(text).toBe("增长率 该复测了");
  });

  it("未配置、占位符缺失或渲染为空时回落内置文案", () => {
    expect(renderTemplate(null, "复习到期", {}, "内置文案")).toBe("内置文案");
    expect(renderTemplate([{ kind: "其他", template: "x" }], "复习到期", {}, "内置文案")).toBe("内置文案");
    expect(renderTemplate([{ kind: "复习到期", template: "{missing}" }], "复习到期", {}, "内置文案")).toBe("内置文案");
  });

  it("复习到期通知使用模板标题，正文仍保留具体原因", () => {
    const [event] = buildReviewNotifications(
      [{ knowledgePoint: "增长率", reason: "已 15 天未练" }],
      new Date("2026-09-01T10:00:00Z"),
      [{ kind: "复习到期", template: "复测提醒：{knowledgePoint}" }],
    );
    expect(event!.title).toBe("复测提醒：增长率");
    expect(event!.body).toBe("已 15 天未练");
  });
});
