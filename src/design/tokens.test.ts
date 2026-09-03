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

/** WCAG 相对亮度与对比度：用于把文本对比度门槛固化为回归守卫。 */
function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channel = (offset: number): number => {
    const raw = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

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

  it("次级/三级文本在白底与画布上均达 WCAG AA（≥4.5:1）", () => {
    // 修复前的 #687A7D/#96A5A7 分别为 4.3:1 与 2.6:1，属可读文本对比度不足
    for (const token of ["muted", "muted-soft"] as const) {
      expect(contrastRatio(colors[token], colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors[token], colors["canvas-grouped"])).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(colors.body, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.ink, colors.surface)).toBeGreaterThanOrEqual(7);
  });

  it("夜间主题的次级文本同样达 AA", () => {
    for (const token of ["muted", "muted-soft"] as const) {
      expect(contrastRatio(nightColors[token], nightColors.canvas)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("§6.4 材质 token 齐备（分隔线 / 分组画布 / 半透明材质）", () => {
    expect(colors.separator).toBe("#E6ECE9");
    expect(colors["canvas-grouped"]).toBe("#F1F5F3");
    // 材质必须是半透明的，否则 backdrop-blur 失去意义
    expect(colors["material-nav"]).toMatch(/^rgba\(/);
    expect(colors["material-sheet"]).toMatch(/^rgba\(/);
    expect(colors["material-fill"]).toMatch(/^rgba\(/);
  });

  it("色值 token 共 38 个（含 7 个材质层 token）", () => {
    expect(Object.keys(colors)).toHaveLength(38);
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

  it("§5.6 inset grouped 节奏与 §6.3 材质阴影", () => {
    expect(spacing["separator-inset"]).toBe(16);
    expect(spacing["group-gap"]).toBe(24);
    expect(spacing["row-min"]).toBe(44);
    // craft floor：阴影必须有偏移与柔和模糊；零偏移彩色光晕属装饰
    expect(elevation["card-rest"]).toMatch(/^0 1px \d+px .*0 \d+px \d+px /);
    // 按压态是物理内凹，不应再叠加描边环（elevation 只声明一次）
    expect(elevation["card-pressed"]).toContain("inset");
    expect(elevation["card-pressed"]).not.toContain("0 0 0 1px");
    // 导航材质自带 -1px 顶边，因此组件不再叠加 border-top
    expect(elevation["nav-material"]).toContain("-1px 0");
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

  it("夜间主题覆盖全部 38 个色值（GAP-4）", () => {
    expect(Object.keys(nightColors).sort()).toEqual(Object.keys(colors).sort());
    expect(nightColors.canvas).toBe("#101719");
    expect(nightColors.primary).toBe("#72AAA6");
    // 分组画布在夜间必须比 canvas 更深，白卡才能靠阴影分离
    expect(relativeLuminance(nightColors["canvas-grouped"])).toBeLessThan(
      relativeLuminance(nightColors.canvas),
    );
  });
});
