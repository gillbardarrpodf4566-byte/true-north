import type { ReactNode } from "react";

/**
 * Chip — §7.8 语义标记，不是装饰。insight=中性强调、warning=需注意、
 * opportunity=曙光铜「机会」语义（全系统最稀缺的暖色，§3.2）。
 */
export type ChipTone = "insight" | "warning" | "opportunity" | "neutral";

const tones: Record<ChipTone, string> = {
  insight: "bg-primary-soft text-primary-active",
  warning: "bg-warning-soft text-warning",
  opportunity: "bg-dawn-soft text-dawn-active",
  neutral: "bg-surface-soft text-muted",
};

export function Chip({
  tone = "insight",
  children,
}: {
  tone?: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-[10px] py-[7px] text-label-md ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
