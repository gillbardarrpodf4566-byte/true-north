import type { ReactNode } from "react";

/**
 * Card 容器族 — §5.5 留白策略：Focus 24–28 / Standard 16–20 / Dense 12–16。
 *
 * §6.3 Apple-grade 材质：elevation 只声明一次。
 * 默认 surface 用「实色填充 + card-rest 双层柔阴影」表达层级，不再叠加 1px 边框
 * （边框 + 宽柔阴影 = ghost card，是被禁止的反模式）。
 * 需要边框的密集场景（列表内、着色底之上）显式选 tone="outline"。
 */
type Padding = "focus" | "standard" | "dense";

const paddings: Record<Padding, string> = {
  focus: "p-6",
  standard: "p-lg",
  dense: "p-md",
};

export type CardTone = "surface" | "faint" | "warm" | "outline" | "sunken";

const tones: Record<CardTone, string> = {
  // 白底 + 双层柔阴影：静息材质（替代此前的 border-border）
  surface: "bg-surface shadow-card-rest",
  // 着色底靠色相区分层级，不加阴影也不加边框
  faint: "bg-primary-faint",
  warm: "bg-canvas-warm shadow-card-rest",
  // 密集上下文：只声明边框，不声明阴影
  outline: "bg-surface border border-border",
  // 凹陷容器：用于分组内嵌区、输入区
  sunken: "bg-surface-soft",
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
  tone?: CardTone;
  padding?: Padding;
  radius?: "sm" | "md" | "lg" | "xl";
  className?: string;
  as?: "section" | "div" | "article";
}) {
  const radii = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl" } as const;
  return (
    <Tag className={`${tones[tone]} ${radii[radius]} ${paddings[padding]} ${className}`}>
      {children}
    </Tag>
  );
}

/** §7.4 Focus Card 六元素结构容器 */
export function FocusCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card tone="faint" padding="focus" radius="md" as="section" className={className}>
      {children}
    </Card>
  );
}

/**
 * 可按压材质面：静息 card-rest → 按压 card-pressed + 轻微缩放。
 * 用于卡片本身即点击目标的场景（§6.3 触觉式反馈）。
 */
export function PressableCard({
  children,
  className = "",
  tone = "surface",
  padding = "standard",
  radius = "md",
  ...rest
}: {
  children: ReactNode;
  tone?: CardTone;
  padding?: Padding;
  radius?: "sm" | "md" | "lg" | "xl";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const radii = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl" } as const;
  return (
    <button
      type="button"
      className={`block w-full text-left transition-[transform,box-shadow,background-color] duration-feedback ease-standard
        active:scale-[0.99] active:shadow-card-pressed focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2
        ${tones[tone]} ${radii[radius]} ${paddings[padding]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
