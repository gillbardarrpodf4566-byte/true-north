import type { ReactNode } from "react";

/**
 * Card 容器族 — §5.5 留白策略：Focus 24–28 / Standard 16–20 / Dense 12–16。
 * surface 全部实色（§6.1 内容层不用玻璃），层级靠 border/tone。
 */
type Padding = "focus" | "standard" | "dense";

const paddings: Record<Padding, string> = {
  focus: "p-6",
  standard: "p-lg",
  dense: "p-md",
};

export function Card({
  children,
  tone = "surface",
  padding = "standard",
  radius = "md",
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  tone?: "surface" | "faint" | "warm";
  padding?: Padding;
  radius?: "md" | "lg" | "xl";
  className?: string;
  as?: "section" | "div" | "article";
}) {
  const tones = {
    surface: "bg-surface border border-border",
    faint: "bg-primary-faint",
    warm: "bg-canvas-warm border border-border",
  } as const;
  const radii = { md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl" } as const;
  return (
    <Tag className={`${tones[tone]} ${radii[radius]} ${paddings[padding]} ${className}`}>
      {children}
    </Tag>
  );
}

/** §7.4 Focus Card 六元素结构容器 */
export function FocusCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card tone="faint" padding="focus" radius="xl" as="section" className={className}>
      {children}
    </Card>
  );
}
