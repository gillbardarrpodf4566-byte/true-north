"use client";

/**
 * TrendLine — §13 preferred chart：line trend。SVG 实现（无图表库依赖）。
 * §8.15：主线 320–520ms path reveal（reduced-motion 直接显示）。
 * §16.5：附标题/当前值/变化方向 + sr-only 数据表替代。
 */
import { useEffect, useState } from "react";
import { duration, easing } from "@/design/tokens";

export interface TrendPoint {
  label: string;
  /** 0–1 归一值或原始值（与 min/max 配套） */
  value: number;
}

export function TrendLine({
  title,
  points,
  unit = "",
  baseline,
  height = 120,
}: {
  title: string;
  points: TrendPoint[];
  unit?: string;
  /** 个人基线（§13.3 比较顺序第一优先），0–1 */
  baseline?: number | null;
  height?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, []);

  const values = points.map((p) => p.value);
  const max = Math.max(...values, baseline ?? 0, 0.0001) * 1.08;
  const min = 0;
  const w = 320;
  const h = height;
  const pad = 8;
  const x = (i: number): number =>
    pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (v: number): number => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const delta =
    last && first && points.length > 1 ? last.value - first.value : null;

  return (
    <figure className="rounded-lg border border-border bg-surface p-lg">
      <figcaption className="text-title-md text-ink">{title}</figcaption>
      {delta != null ? (
        <p className="mt-xs text-caption text-muted">
          当前 {formatVal(last!.value, unit)}，较首次{" "}
          {delta >= 0 ? "上升" : "下降"} {Math.abs(Math.round(delta * 100))}
          {unit === "%" ? " 个百分点" : unit}
        </p>
      ) : null}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-md w-full"
        role="img"
        aria-label={`${title}趋势图`}
      >
        {baseline != null ? (
          <line
            x1={pad}
            x2={w - pad}
            y1={y(baseline)}
            y2={y(baseline)}
            stroke="var(--ja-color-border-strong)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ) : null}
        <path
          d={path}
          fill="none"
          stroke="var(--ja-color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: revealed ? 0 : 1000,
            transition: `stroke-dashoffset ${duration.content + duration.state}ms ${easing.standard}`,
          }}
        />
        {points.map((p, i) =>
          i === points.length - 1 ? (
            <circle
              key={p.label}
              cx={x(i)}
              cy={y(p.value)}
              r="4"
              fill="var(--ja-color-primary)"
              style={{ opacity: revealed ? 1 : 0, transition: `opacity ${duration.state}ms` }}
            />
          ) : null,
        )}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">场次</th>
            <th scope="col">数值</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatVal(p.value, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function formatVal(v: number, unit: string): string {
  if (unit === "%") return `${Math.round(v * 100)}%`;
  return `${Math.round(v * 10) / 10}${unit}`;
}
