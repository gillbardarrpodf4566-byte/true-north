/**
 * check-tokens — token 漂移检查。
 *
 * 规则（GOAL_PROMPT 硬约束）：src/ 下除生成文件外，不得出现硬编码
 * 十六进制色值、px 字号、ms 时长、cubic-bezier。一律从 src/design/tokens
 * 或 CSS 变量引用。
 *
 * 白名单（均为 scripts/build-tokens.ts 产物）：tokens.css / theme.css / design/tokens.ts
 * 运行：pnpm check:tokens
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const GENERATED = [
  join(SRC, "styles", "tokens.css"),
  join(SRC, "styles", "theme.css"),
  join(SRC, "design", "tokens.ts"),
].map((p) => resolve(p));

const RULES: Array<{
  name: string;
  pattern: RegExp;
  exts: string[];
  /** *.test.ts 豁免：测试对生成物断言规范原文，是生成器本身的回归守卫 */
  testExempt?: boolean;
  /** 命中后的白名单判断（如 reduced-motion 的 0.01ms） */
  allow?: (match: string) => boolean;
}> = [
  {
    name: "硬编码色值",
    pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/,
    exts: [".ts", ".tsx", ".css"],
    testExempt: true,
  },
  {
    name: "ms 时长字面量",
    pattern: /\b\d+(?:\.\d+)?ms\b/,
    exts: [".ts", ".tsx", ".css"],
    /** 0.01ms 是 prefers-reduced-motion 的标准关闭动画写法（globals.css），非设计时长 */
    allow: (m: string) => m === "0.01ms",
  },
  { name: "cubic-bezier 字面量", pattern: /cubic-bezier\(/, exts: [".ts", ".tsx", ".css"], testExempt: true },
  { name: "px 字号", pattern: /font-size\s*:\s*\d+(?:\.\d+)?px/, exts: [".css"] },
  {
    name: "px 字号（TS）",
    pattern: /fontSize\s*[:=]\s*["'`]?\d/,
    exts: [".ts", ".tsx"],
  },
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** 注释行豁免：规范条文引用（如 §8.9 的逐帧时间轴）必须能原样写进文档注释 */
function isCommentLine(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("*") ||
    t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("{/*") ||
    t.startsWith("<!--")
  );
}

const violations: string[] = [];
for (const file of walk(SRC)) {
  const rp = relative(ROOT, file);
  if (GENERATED.includes(resolve(file))) continue;
  if (file.endsWith(".d.ts")) continue;
  const ext = extname(file);
  const content = readFileSync(file, "utf8");
  for (const rule of RULES) {
    if (!rule.exts.includes(ext)) continue;
    if (rule.testExempt && /\.test\.(ts|tsx)$/.test(file)) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (isCommentLine(line)) continue;
      const m = line.match(rule.pattern);
      if (m && !(rule.allow?.(m[0]) ?? false)) {
        violations.push(`${rp}:${i + 1}  [${rule.name}] ${m[0]}  ← ${line.trim().slice(0, 80)}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n✗ token 漂移 ${violations.length} 处：\n`);
  for (const v of violations) console.error("  " + v);
  console.error("\n请改用 src/design/tokens 常量或 --ja-* CSS 变量。");
  process.exit(1);
}
console.log("✓ token 漂移检查通过（src/ 无硬编码色值/时长/曲线/字号）");
