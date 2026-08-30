import { describe, expect, it } from "vitest";
import {
  colors,
  nightColors,
  typography,
  rounded,
  spacing,
  duration,
  easing,
  elevation,
  zIndex,
  gutter,
  clampCjkFontWeight,
  DESIGN_NAME,
} from "@/design/tokens";

describe("design tokens（DESIGN.md frontmatter 管线）", () => {
  it("主题名与版本来自 DESIGN.md", () => {
    expect(DESIGN_NAME).toBe("JianAn-Quiet-Horizon");
  });

  it("关键色值与规范一致", () => {
    expect(colors.primary).toBe("#2B6367");
    expect(colors["primary-active"]).toBe("#214E52");
    expect(colors.dawn).toBe("#C88E56");
    expect(colors.ink).toBe("#122B2F");
    expect(colors.canvas).toBe("#F7F9F8");
    expect(colors["focus-ring"]).toBe("#4E8E91");
  });

  it("色值 token 共 31 个", () => {
    expect(Object.keys(colors)).toHaveLength(31);
  });

  it("字号阶梯关键级", () => {
    expect(typography["display-web"].fontSize).toBe(56);
    expect(typography["display-app"].fontSize).toBe(34);
    expect(typography["stat-xl"].fontSize).toBe(48);
    expect(typography["stat-xl"].fontWeight).toBe(590);
    expect(typography["stat-xl"].fontFamily).toBe("stat");
    expect(typography["body-md"].fontFamily).toBe("ui");
    expect(Object.keys(typography)).toHaveLength(17);
  });

  it("圆角 / 间距 / 时长", () => {
    expect(rounded.md).toBe(16);
    expect(rounded.xxl).toBe(36);
    expect(spacing.base).toBe(16);
    expect(spacing["margin-mobile"]).toBe(20);
    expect(duration.state).toBe(220);
    expect(duration.hero).toBe(560);
    expect(easing.standard).toBe("cubic-bezier(0.20, 0.00, 0.00, 1.00)");
    expect(elevation["lift-sm"]).toContain("8px 24px");
  });

  it("中文字重钳制（GAP-2）", () => {
    expect(clampCjkFontWeight(620)).toBe(600);
    expect(clampCjkFontWeight(590)).toBe(600);
    expect(clampCjkFontWeight(580)).toBe(600);
    expect(clampCjkFontWeight(560)).toBe(500);
    expect(clampCjkFontWeight(450)).toBe(400);
    expect(clampCjkFontWeight(400)).toBe(400);
  });

  it("z-index 四层（GAP-1）与 gutter 分端（GAP-3）", () => {
    expect(zIndex).toEqual({ atmosphere: 0, content: 10, activeContext: 20, functional: 30 });
    expect(gutter).toEqual({ mobile: 12, tablet: 16, desktop: 16 });
  });

  it("夜间主题覆盖全部 31 个色值（GAP-4）", () => {
    expect(Object.keys(nightColors).sort()).toEqual(Object.keys(colors).sort());
    expect(nightColors.canvas).toBe("#101719");
    expect(nightColors.primary).toBe("#72AAA6");
  });
});
