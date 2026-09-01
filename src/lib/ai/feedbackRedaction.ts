/**
 * AI 质量候选的最小必要脱敏。原工单仍按客服权限保存；
 * AI 运营候选只允许使用本模块输出的 sanitizedExcerpt。
 */
export type PiiCategory = "手机号" | "邮箱" | "身份证" | "密钥" | "URL令牌" | "账号标识";

export interface RedactionResult {
  sanitizedExcerpt: string;
  piiCategories: PiiCategory[];
  redactionVersion: "v1";
  status: "redacted" | "clean" | "review_required";
}

const patterns: Array<{ category: PiiCategory; expression: RegExp; replacement: string }> = [
  { category: "手机号", expression: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, replacement: "[已脱敏手机号]" },
  { category: "邮箱", expression: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replacement: "[已脱敏邮箱]" },
  { category: "身份证", expression: /(?<![A-Z0-9])\d{17}[0-9Xx](?![A-Z0-9])/g, replacement: "[已脱敏身份证]" },
  { category: "密钥", expression: /\b(?:Bearer\s+)?(?:sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{20,})\b/gi, replacement: "[已脱敏密钥]" },
  { category: "URL令牌", expression: /([?&](?:token|access_token|authorization|apikey|api_key|secret|code)=)[^&#\s]+/gi, replacement: "$1[已脱敏]" },
  { category: "账号标识", expression: /(?:账号|用户(?:名|ID)?|手机号)\s*[:：]\s*[^\s，。,；;]{3,}/g, replacement: "[已脱敏账号标识]" },
];

/** 返回截断后的安全摘录；无法可靠清理的控制字符标为人工复核。 */
export function redactFeedback(text: string, maxLength = 320): RedactionResult {
  let result = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  const found = new Set<PiiCategory>();
  for (const pattern of patterns) {
    if (pattern.expression.test(result)) found.add(pattern.category);
    pattern.expression.lastIndex = 0;
    result = result.replace(pattern.expression, pattern.replacement);
  }
  result = result.replace(/\s+/g, " ").trim();
  const truncated = result.length > maxLength ? `${result.slice(0, maxLength)}…` : result;
  return {
    sanitizedExcerpt: truncated || "[无可显示摘录]",
    piiCategories: [...found],
    redactionVersion: "v1",
    status: found.size > 0 ? "redacted" : "clean",
  };
}
