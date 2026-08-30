/**
 * build-tokens — DESIGN.md frontmatter → 代码侧 token 的唯一管线。
 *
 * 产物（全部自动生成，禁止手改）：
 *   src/styles/tokens.css   CSS 自定义属性（--ja-*），含夜间主题覆盖
 *   src/styles/theme.css    Tailwind v4 `@theme inline` 映射
 *   src/design/tokens.ts    类型化常量 + z-index 层级 + 中文字重钳制映射
 *
 * 规范原文：docs/02-设计系统/见岸_Quiet_Horizon_动态Google_Stitch_DESIGN.md
 * 运行：pnpm tokens
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";

const ROOT = resolve(import.meta.dirname, "..");
const DESIGN_MD = resolve(
  ROOT,
  "docs/02-设计系统/见岸_Quiet_Horizon_动态Google_Stitch_DESIGN.md",
);

// ---------- 读取与解析 ----------

const source = readFileSync(DESIGN_MD, "utf8");
const lines = source.split("\n");
if (lines[0]?.trim() !== "---") throw new Error("DESIGN.md 缺少 YAML frontmatter 起始行");
const closeIndex = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
if (closeIndex < 0) throw new Error("DESIGN.md frontmatter 未闭合");
const fm = yaml.load(lines.slice(1, closeIndex).join("\n")) as DesignTokens;

interface TypographyEntry {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
}

interface DesignTokens {
  version: string;
  name: string;
  colors: Record<string, string>;
  typography: Record<string, TypographyEntry>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  motion: Record<string, string | number>;
  elevation: Record<string, string>;
  interaction: Record<string, string>;
  components: Record<string, Record<string, unknown>>;
}

function assertEntries<T>(v: unknown, section: string): Record<string, T> {
  if (!v || typeof v !== "object") throw new Error(`frontmatter 缺少 ${section} 段`);
  return v as Record<string, T>;
}

const colors = assertEntries<string>(fm.colors, "colors");
const typography = assertEntries<TypographyEntry>(fm.typography, "typography");
const rounded = assertEntries<string>(fm.rounded, "rounded");
const spacing = assertEntries<string>(fm.spacing, "spacing");
const motion = assertEntries<string | number>(fm.motion, "motion");
const elevation = assertEntries<string>(fm.elevation, "elevation");
const interaction = assertEntries<string>(fm.interaction, "interaction");

const px = (v: string): number => {
  const n = Number.parseFloat(v);
  if (Number.isNaN(n)) throw new Error(`无法解析 px 值: ${v}`);
  return n;
};

// ---------- 规范缺口补充（记录于 docs/05-实现/spec-gaps.md） ----------

/**
 * GAP-1 z-index：§5.4 只有 Z0–Z3 四层语义，无数值。
 * 补充：每层间隔 10，留出插入空间；禁止业务代码使用语义之外的数值。
 */
const zIndex = {
  atmosphere: 0, // Z0 Atmosphere：canvas、极轻 radial light
  content: 10, // Z1 Content：题目、文章、数据卡
  activeContext: 20, // Z2 Active Context：进行中训练卡、展开证据卡
  functional: 30, // Z3 Functional Layer：底部导航 / Sheet / Popover / 浮动工具
} as const;

/**
 * GAP-2 可变字重：字号表使用 620/590/580/560/450 等可变字重，仅 Inter Variable 支持。
 * 中文字体（PingFang SC 等）无可变轴，可用字重档位为 400/500/600。
 * 钳制规则：≥580 → 600；500–579 → 500；<500 → 400。
 */
const CJK_WEIGHT_CLAMP = { thresholdHigh: 580, thresholdMid: 500 } as const;

/**
 * GAP-3 gutter 冲突：frontmatter spacing.gutter=16px 单值，§5.1 移动端=12px、§5.2 平板=16px。
 * 裁决：按 §5 分端取值，废弃单值 gutter。
 */
const gutters = { mobile: 12, tablet: 16, desktop: 16 } as const;

/**
 * GAP-4 夜间主题：§17 只给出 8 个色值，其余 23 个 token 由以下规则派生——
 * 表面色沿 canvas→surface 阶梯加深；语义色保持色相、提高明度以保证深底对比 ≥4.5:1；
 * soft 色改为对应色相的低亮度深底；on-primary 反转为深色（primary 变亮后白字对比不足）。
 */
const NIGHT_FROM_SPEC: Record<string, string> = {
  canvas: "#101719",
  surface: "#162023",
  "surface-soft": "#1B292C",
  ink: "#EAF1EF",
  body: "#C3CFCC",
  muted: "#8FA09C",
  primary: "#72AAA6",
  dawn: "#D5A36F",
};

const NIGHT_DERIVED: Record<string, string> = {
  "primary-active": "#5E9490",
  "primary-soft": "#24403E",
  "primary-faint": "#1E3230",
  "horizon-glow": "#4E7F7B",
  "dawn-active": "#E3B98C",
  "dawn-soft": "#3B2F21",
  "canvas-warm": "#131A18",
  "surface-strong": "#243234",
  border: "#2B3A3C",
  "border-strong": "#3D4C4E",
  "muted-soft": "#6F7F7C",
  success: "#79B295",
  "success-soft": "#20322A",
  warning: "#CDA06B",
  "warning-soft": "#38301F",
  error: "#CE8578",
  "error-soft": "#3A2823",
  info: "#86A7BC",
  "info-soft": "#22323C",
  "on-primary": "#0C1414",
  "on-dark": "#F8FBFA",
  scrim: "#04080A",
  "focus-ring": "#85BDB8",
};

const nightColors: Record<string, string> = { ...NIGHT_FROM_SPEC, ...NIGHT_DERIVED };
for (const k of Object.keys(colors)) {
  if (!(k in nightColors)) throw new Error(`夜间主题缺少 token: colors.${k}`);
}

// ---------- 生成 tokens.css ----------

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();

function cssVars(prefix: string, entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([k, v]) => `  ${prefix}-${kebab(k)}: ${v};`)
    .join("\n");
}

const fontFamilyBase = typography["body-md"]?.fontFamily ?? "";
const fontFamilyStat = typography["stat-xl"]?.fontFamily ?? "";

const tokensCss = `/* 由 scripts/build-tokens.ts 自动生成 — 禁止手改
 * 来源：DESIGN.md frontmatter（version ${fm.version}）+ 规范缺口补充（docs/05-实现/spec-gaps.md）
 * 重新生成：pnpm tokens */
:root {
  color-scheme: light;
${cssVars("--ja-color", colors)}

  /* typography */
  --ja-font-ui: ${fontFamilyBase};
  --ja-font-stat: ${fontFamilyStat};
${Object.entries(typography)
  .map(
    ([k, t]) =>
      `  --ja-font-size-${kebab(k)}: ${t.fontSize};\n` +
      `  --ja-font-weight-${kebab(k)}: ${t.fontWeight};\n` +
      `  --ja-line-height-${kebab(k)}: ${t.lineHeight};\n` +
      `  --ja-letter-spacing-${kebab(k)}: ${t.letterSpacing};`,
  )
  .join("\n")}

${cssVars("--ja-radius", rounded)}

${cssVars("--ja-space", spacing)}

${cssVars("--ja-duration", Object.fromEntries(Object.entries(motion).filter(([, v]) => typeof v === "string" && v.endsWith("ms")) as [string, string][]))}

${cssVars("--ja-easing", Object.fromEntries(Object.entries(motion).filter(([k]) => k.startsWith("easing-")) as [string, string][]))}
${/* spring 参数为 Web 无法原生表达的物理参数，保留在 tokens.ts 供 JS 动画使用 */ ""}
${cssVars("--ja-elevation", elevation)}

${cssVars("--ja-touch", interaction)}
}

/* 夜间学习主题（§17 + 缺口补充，见 spec-gaps.md GAP-4） */
[data-theme="night"] {
  color-scheme: dark;
${cssVars("--ja-color", nightColors)}
}
`;

// ---------- 生成 theme.css（Tailwind v4） ----------

const motionDurations = Object.entries(motion).filter(
  ([, v]) => typeof v === "string" && String(v).endsWith("ms"),
) as [string, string][];
const easings = Object.entries(motion).filter(([k]) => k.startsWith("easing-")) as [
  string,
  string,
][];

const themeCss = `/* 由 scripts/build-tokens.ts 自动生成 — 禁止手改
 * Tailwind v4 @theme inline 映射：bg-primary / text-ink / p-lg / rounded-md / shadow-lift-sm /
 * text-title-lg（含行高字重字距）/ ease-standard 等工具类由此产生 */
@theme inline {
${Object.keys(colors)
  .map((k) => `  --color-${kebab(k)}: var(--ja-color-${kebab(k)});`)
  .join("\n")}

${Object.keys(rounded)
  .map((k) => `  --radius-${kebab(k)}: var(--ja-radius-${kebab(k)});`)
  .join("\n")}

${Object.keys(spacing)
  .map((k) => `  --spacing-${kebab(k)}: var(--ja-space-${kebab(k)});`)
  .join("\n")}

${Object.keys(elevation)
  .map((k) => `  --shadow-${kebab(k)}: var(--ja-elevation-${kebab(k)});`)
  .join("\n")}

${motionDurations.map(([k]) => `  --duration-${kebab(k)}: var(--ja-duration-${kebab(k)});`).join("\n")}

${easings.map(([k]) => `  --ease-${kebab(k).replace("easing-", "")}: var(--ja-easing-${kebab(k)});`).join("\n")}

${Object.keys(typography)
  .map(
    (k) =>
      `  --text-${kebab(k)}: var(--ja-font-size-${kebab(k)});\n` +
      `  --text-${kebab(k)}--line-height: var(--ja-line-height-${kebab(k)});\n` +
      `  --text-${kebab(k)}--font-weight: var(--ja-font-weight-${kebab(k)});\n` +
      `  --text-${kebab(k)}--letter-spacing: var(--ja-letter-spacing-${kebab(k)});`,
  )
  .join("\n")}

  --font-ui: var(--ja-font-ui);
  --font-stat: var(--ja-font-stat);
}
`;

// ---------- 生成 tokens.ts ----------

const durationEntries = motionDurations.map(([k, v]) => [kebab(k), px(v)] as const);
const springEntries = Object.entries(motion)
  .filter(([k]) => k.startsWith("spring-"))
  .map(([k, v]) => [kebab(k.replace("spring-", "")), String(v)] as const);

const tokensTs = `/* 由 scripts/build-tokens.ts 自动生成 — 禁止手改
 * 来源：DESIGN.md frontmatter（version ${fm.version}）。重新生成：pnpm tokens */

export const DESIGN_VERSION = "${fm.version}" as const;
export const DESIGN_NAME = "${fm.name}" as const;

export const colors = {
${Object.entries(colors)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: "${v}",`)
  .join("\n")}
} as const;

export const nightColors = {
${Object.entries(nightColors)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: "${v}",`)
  .join("\n")}
} as const;

export interface TypographyToken {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: string;
  readonly fontFamily: "ui" | "stat";
}

export const typography = {
${Object.entries(typography)
  .map(
    ([k, t]) =>
      `  ${JSON.stringify(kebab(k))}: {\n` +
      `    fontSize: ${px(t.fontSize)},\n` +
      `    fontWeight: ${t.fontWeight},\n` +
      `    lineHeight: ${t.lineHeight},\n` +
      `    letterSpacing: ${JSON.stringify(String(t.letterSpacing))},\n` +
      `    fontFamily: ${t.fontFamily.startsWith("Inter Variable, SF Pro") ? '"stat"' : '"ui"'},\n` +
      `  } as const satisfies TypographyToken,`,
  )
  .join("\n")}
} as const;

export const rounded = {
${Object.entries(rounded)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: ${px(v)},`)
  .join("\n")}
} as const;

export const spacing = {
${Object.entries(spacing)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: ${px(v)},`)
  .join("\n")}
} as const;

export const duration = {
${durationEntries.map(([k, v]) => `  ${JSON.stringify(k)}: ${v},`).join("\n")}
} as const;

export const easing = {
${easings
  .map(([k, v]) => `  ${JSON.stringify(kebab(k).replace("easing-", ""))}: ${JSON.stringify(v)},`)
  .join("\n")}
} as const;

export const spring = {
${springEntries
  .map(([k, v]) => `  /** mass/stiffness/damping：${v} */\n  ${JSON.stringify(k)}: { ${v
    .split(",")
    .map((p) => {
      const [n, val] = p.trim().split(/\s+/);
      return `${n}: ${val}`;
    })
    .join(", ")} } as const,`)
  .join("\n")}
} as const;

export const elevation = {
${Object.entries(elevation)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: ${JSON.stringify(v)},`)
  .join("\n")}
} as const;

export const interaction = {
${Object.entries(interaction)
  .map(([k, v]) => `  ${JSON.stringify(kebab(k))}: ${JSON.stringify(v)},`)
  .join("\n")}
} as const;

/** GAP-1（spec-gaps.md）：§5.4 四层深度模型的数值化。 */
export const zIndex = {
  atmosphere: ${zIndex.atmosphere},
  content: ${zIndex.content},
  activeContext: ${zIndex.activeContext},
  functional: ${zIndex.functional},
} as const;

/** GAP-2（spec-gaps.md）：中文字重钳制 — 可变字重落到中文栈的 400/500/600。 */
export function clampCjkFontWeight(weight: number): number {
  return clampCjkWeightImpl(weight);
}

/** GAP-3（spec-gaps.md）：gutter 分端取值，废弃 frontmatter 单值。 */
export const gutter = {
  mobile: ${gutters.mobile},
  tablet: ${gutters.tablet},
  desktop: ${gutters.desktop},
} as const;
`;

// clampCjkWeightImpl 内联常量
const tokensTsWithClamp = tokensTs.replace(
  "  return clampCjkWeightImpl(weight);",
  `  if (weight >= ${CJK_WEIGHT_CLAMP.thresholdHigh}) return 600;
  if (weight >= ${CJK_WEIGHT_CLAMP.thresholdMid}) return 500;
  return 400;`,
);

// ---------- 写盘 ----------

function write(file: string, content: string): void {
  const p = resolve(ROOT, file);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
  console.log("✓", file, `(${content.split("\n").length} 行)`);
}

write("src/styles/tokens.css", tokensCss);
write("src/styles/theme.css", themeCss);
write("src/design/tokens.ts", tokensTsWithClamp);
console.log(`\ntoken 管线完成：colors ${Object.keys(colors).length} / typography ${Object.keys(typography).length} / spacing ${Object.keys(spacing).length} / motion ${motionDurations.length}+${easings.length}+${springEntries.length}`);
