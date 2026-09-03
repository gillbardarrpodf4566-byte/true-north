import type { ReactNode } from "react";

/**
 * Inset Grouped List — §5.7 Apple 工艺骨架。
 *
 * 结构：分组标题（可选）→ 白底圆角容器 → 行（44px 起、分隔线左内缩、末行无线）→ 分组脚注（可选）。
 * 分组标题上方留白大于下方（craft floor：标题上间距 > 下间距）。
 * 与 Card 的区别：Card 是单个信息容器，Group 是同构行的集合；两者不可嵌套。
 */
export function InsetGroup({
  children,
  header,
  footer,
  className = "",
}: {
  children: ReactNode;
  /** 分组标题：仅用于真实分类语义，不作装饰性 eyebrow */
  header?: string;
  /** 分组脚注：解释该组数据的来源或后果 */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {header ? (
        <h2 className="mt-group-gap mb-sm px-base text-label-md text-muted">{header}</h2>
      ) : null}
      <div className="ja-group">{children}</div>
      {footer ? <p className="mt-sm px-base text-caption text-muted">{footer}</p> : null}
    </section>
  );
}

/**
 * 列表行。默认分隔线左内缩 16px 对齐文本；`fullSeparator` 让线贯穿整行。
 * `href`/`onClick` 任一存在即启用按压材质反馈。
 */
export function ListRow({
  children,
  leading,
  trailing,
  title,
  subtitle,
  fullSeparator = false,
  interactive = false,
  className = "",
}: {
  children?: ReactNode;
  /** 行首图标或缩略（宽度固定，保证分隔线与文本对齐） */
  leading?: ReactNode;
  /** 行尾控件、数值或 chevron */
  trailing?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  fullSeparator?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const content = children ?? (
    <div className="min-w-0 flex-1">
      {title ? <p className="text-body-md text-ink">{title}</p> : null}
      {subtitle ? <p className="mt-micro text-caption text-muted">{subtitle}</p> : null}
    </div>
  );

  return (
    <div
      className={`ja-row ${fullSeparator ? "ja-row-full" : ""} ${interactive ? "ja-row-press" : ""}
        flex items-center gap-md px-base py-md ${className}`}
    >
      {leading ? <span className="flex shrink-0 items-center justify-center">{leading}</span> : null}
      {content}
      {trailing ? <span className="flex shrink-0 items-center gap-sm">{trailing}</span> : null}
    </div>
  );
}

/** 行尾 chevron：Apple 可点击行的标准提示 */
export function RowChevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true" className="text-muted-soft">
      <path
        d="M1 1l5.5 5.5L1 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
