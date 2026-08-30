"use client";

/**
 * Button — DESIGN.md §7.1–7.3。
 * primary: 48px 高、radius sm、pressed scale .985（feedback 档时长）、disabled 用 surface-strong+muted、
 * loading 保持文本位置右侧 14px spinner。secondary: 白底 + 1px border-strong。
 * tertiary: 无底色，用于「查看依据 / 调整计划」等不抢主 CTA 的动作。
 */
import { forwardRef } from "react";
import { duration } from "@/design/tokens";

type Variant = "primary" | "secondary" | "tertiary";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, fullWidth = false, className = "", children, disabled, ...rest },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-sm rounded-sm text-button-md select-none " +
    "transition-[transform,background-color,border-color,opacity] ease-standard active:scale-[0.985] " +
    "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 " +
    (fullWidth ? "w-full " : "");
  const variants: Record<Variant, string> = {
    primary: disabled || loading
      ? "bg-surface-strong text-muted cursor-not-allowed"
      : "bg-primary text-on-primary active:bg-primary-active",
    secondary: disabled || loading
      ? "border border-border bg-surface text-muted cursor-not-allowed"
      : "border border-border-strong bg-surface text-ink hover:bg-surface-soft active:scale-[0.99] active:border-primary-active",
    tertiary: disabled || loading
      ? "text-muted-soft cursor-not-allowed"
      : "text-primary active:opacity-80",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${loading ? "cursor-wait" : ""} ${className}`}
      style={{ transitionDuration: `${duration.feedback}ms` }}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={loading ? "opacity-90" : undefined}>{children}</span>
      {loading ? <Spinner /> : null}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      className="animate-spin text-current"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M13 7A6 6 0 0 0 7 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
