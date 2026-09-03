"use client";

/**
 * Switch — §7.9 开关控件。
 *
 * 统一此前散落在「我的」页的三处开关实现（尺寸分别为 h-8/w-14 与 h-7/w-12）。
 * 材质：轨道用 surface-strong（关）/ primary（开），滑块为实色 surface 并带 card-rest 阴影，
 * 位移用 spring-control 档时长与 emphasized 缓动，符合「动效因果」——状态改变即可见反馈。
 */
import { duration } from "@/design/tokens";

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 无障碍名称；若相邻已有可见文本，仍应提供以便读屏独立定位 */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-13 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${checked ? "bg-primary" : "bg-surface-strong"}`}
      style={{ transitionDuration: `${duration.state}ms` }}
    >
      <span
        className={`absolute top-1 left-1 block h-6 w-6 rounded-full bg-surface shadow-card-rest transition-transform ease-emphasized ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
        style={{ transitionDuration: `${duration.state}ms` }}
      />
    </button>
  );
}
