/* 由 scripts/build-tokens.ts 自动生成 — 禁止手改
 * 来源：DESIGN.md frontmatter（version alpha）。重新生成：pnpm tokens */

export const DESIGN_VERSION = "alpha" as const;
export const DESIGN_NAME = "JianAn-Quiet-Horizon" as const;

export const colors = {
  "primary": "#2B6367",
  "primary-active": "#214E52",
  "primary-soft": "#DCEBE8",
  "primary-faint": "#EEF5F3",
  "horizon-glow": "#86BDB5",
  "dawn": "#C88E56",
  "dawn-active": "#A96F3D",
  "dawn-soft": "#F4E8D9",
  "ink": "#122B2F",
  "body": "#34484B",
  "muted": "#687A7D",
  "muted-soft": "#96A5A7",
  "canvas": "#F7F9F8",
  "canvas-warm": "#FAF8F4",
  "surface": "#FFFFFF",
  "surface-soft": "#F0F4F2",
  "surface-strong": "#E7EEEB",
  "border": "#DCE4E1",
  "border-strong": "#C7D3CF",
  "success": "#4F7B68",
  "success-soft": "#E5F0EA",
  "warning": "#B67A43",
  "warning-soft": "#F7EBDD",
  "error": "#B85A50",
  "error-soft": "#F9E7E4",
  "info": "#4F7287",
  "info-soft": "#E5EEF3",
  "on-primary": "#FFFFFF",
  "on-dark": "#F8FBFA",
  "scrim": "#0B1B1E",
  "focus-ring": "#4E8E91",
} as const;

export const nightColors = {
  "canvas": "#101719",
  "surface": "#162023",
  "surface-soft": "#1B292C",
  "ink": "#EAF1EF",
  "body": "#C3CFCC",
  "muted": "#8FA09C",
  "primary": "#72AAA6",
  "dawn": "#D5A36F",
  "primary-active": "#5E9490",
  "primary-soft": "#24403E",
  "primary-faint": "#1E3230",
  "horizon-glow": "#4E7F7B",
  "dawn-active": "#E3B98C",
  "dawn-soft": "#3B2F21",
  "canvas-warm": "#131A18",
  "surface-strong": "#243234",
  "border": "#2B3A3C",
  "border-strong": "#3D4C4E",
  "muted-soft": "#6F7F7C",
  "success": "#79B295",
  "success-soft": "#20322A",
  "warning": "#CDA06B",
  "warning-soft": "#38301F",
  "error": "#CE8578",
  "error-soft": "#3A2823",
  "info": "#86A7BC",
  "info-soft": "#22323C",
  "on-primary": "#0C1414",
  "on-dark": "#F8FBFA",
  "scrim": "#04080A",
  "focus-ring": "#85BDB8",
} as const;

export interface TypographyToken {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: string;
  readonly fontFamily: "ui" | "stat";
}

export const typography = {
  "display-web": {
    fontSize: 56,
    fontWeight: 620,
    lineHeight: 1.08,
    letterSpacing: "-0.035em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "display-app": {
    fontSize: 34,
    fontWeight: 620,
    lineHeight: 1.16,
    letterSpacing: "-0.025em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "headline-xl": {
    fontSize: 28,
    fontWeight: 620,
    lineHeight: 1.22,
    letterSpacing: "-0.018em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "headline-lg": {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.28,
    letterSpacing: "-0.012em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "title-lg": {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: "-0.006em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "title-md": {
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.42,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "body-lg": {
    fontSize: 17,
    fontWeight: 400,
    lineHeight: 1.65,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "body-md": {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.62,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "body-sm": {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "label-md": {
    fontSize: 13,
    fontWeight: 560,
    lineHeight: 1.38,
    letterSpacing: "0.01em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "caption": {
    fontSize: 12,
    fontWeight: 450,
    lineHeight: 1.45,
    letterSpacing: "0.01em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "micro": {
    fontSize: 11,
    fontWeight: 560,
    lineHeight: 1.36,
    letterSpacing: "0.025em",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "stat-xl": {
    fontSize: 48,
    fontWeight: 590,
    lineHeight: 1,
    letterSpacing: "-0.035em",
    fontFamily: "stat",
  } as const satisfies TypographyToken,
  "stat-lg": {
    fontSize: 36,
    fontWeight: 590,
    lineHeight: 1.05,
    letterSpacing: "-0.025em",
    fontFamily: "stat",
  } as const satisfies TypographyToken,
  "stat-md": {
    fontSize: 26,
    fontWeight: 580,
    lineHeight: 1.1,
    letterSpacing: "-0.018em",
    fontFamily: "stat",
  } as const satisfies TypographyToken,
  "button-md": {
    fontSize: 15,
    fontWeight: 590,
    lineHeight: 1.2,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
  "button-sm": {
    fontSize: 13,
    fontWeight: 580,
    lineHeight: 1.2,
    letterSpacing: "0",
    fontFamily: "ui",
  } as const satisfies TypographyToken,
} as const;

export const rounded = {
  "none": 0,
  "xs": 6,
  "sm": 10,
  "md": 16,
  "lg": 22,
  "xl": 28,
  "xxl": 36,
  "full": 9999,
} as const;

export const spacing = {
  "micro": 2,
  "xs": 4,
  "sm": 8,
  "md": 12,
  "base": 16,
  "lg": 20,
  "xl": 24,
  "xxl": 32,
  "xxxl": 40,
  "section": 48,
  "section-lg": 64,
  "hero": 88,
  "gutter": 16,
  "margin-mobile": 20,
  "margin-tablet": 32,
  "margin-desktop": 48,
} as const;

export const duration = {
  "instant": 80,
  "feedback": 120,
  "fast": 160,
  "state": 220,
  "content": 320,
  "spatial": 380,
  "sheet": 420,
  "hero": 560,
} as const;

export const easing = {
  "standard": "cubic-bezier(0.20, 0.00, 0.00, 1.00)",
  "enter": "cubic-bezier(0.05, 0.70, 0.10, 1.00)",
  "exit": "cubic-bezier(0.30, 0.00, 0.80, 0.15)",
  "emphasized": "cubic-bezier(0.20, 0.80, 0.20, 1.00)",
} as const;

export const spring = {
  /** mass/stiffness/damping：mass 0.8, stiffness 420, damping 34 */
  "control": { mass: 0.8, stiffness: 420, damping: 34 } as const,
  /** mass/stiffness/damping：mass 1.0, stiffness 280, damping 30 */
  "container": { mass: 1.0, stiffness: 280, damping: 30 } as const,
  /** mass/stiffness/damping：mass 1.0, stiffness 220, damping 28 */
  "hero": { mass: 1.0, stiffness: 220, damping: 28 } as const,
} as const;

export const elevation = {
  "flat": "none",
  "hairline": "0 0 0 1px rgba(18,43,47,0.06)",
  "lift-sm": "0 1px 2px rgba(18,43,47,0.04), 0 8px 24px rgba(18,43,47,0.05)",
  "lift-md": "0 2px 6px rgba(18,43,47,0.06), 0 18px 48px rgba(18,43,47,0.08)",
  "lift-focus": "0 10px 36px rgba(43,99,103,0.12), 0 1px 0 rgba(255,255,255,0.7) inset",
} as const;

export const interaction = {
  "min-touch": "44px",
  "preferred-touch": "48px",
  "desktop-control-height": "40px",
  "mobile-control-height": "48px",
  "swipe-threshold": "64px",
  "sheet-dismiss-velocity": "900px/s",
  "long-press-delay": "420ms",
  "tooltip-delay-desktop": "550ms",
} as const;

/** GAP-1（spec-gaps.md）：§5.4 四层深度模型的数值化。 */
export const zIndex = {
  atmosphere: 0,
  content: 10,
  activeContext: 20,
  functional: 30,
} as const;

/** GAP-2（spec-gaps.md）：中文字重钳制 — 可变字重落到中文栈的 400/500/600。 */
export function clampCjkFontWeight(weight: number): number {
  if (weight >= 580) return 600;
  if (weight >= 500) return 500;
  return 400;
}

/** GAP-3（spec-gaps.md）：gutter 分端取值，废弃 frontmatter 单值。 */
export const gutter = {
  mobile: 12,
  tablet: 16,
  desktop: 16,
} as const;
