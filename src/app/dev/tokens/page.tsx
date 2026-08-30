"use client";

import { useState } from "react";
import {
  colors,
  nightColors,
  typography,
  rounded,
  spacing,
  duration,
  easing,
  elevation,
  zIndex,
  clampCjkFontWeight,
  DESIGN_VERSION,
} from "@/design/tokens";

function ThemeToggle() {
  const [night, setNight] = useState(false);
  const toggle = () => {
    const next = !night;
    setNight(next);
    document.documentElement.dataset.theme = next ? "night" : "light";
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-sm bg-primary px-lg py-sm text-label-md text-on-primary transition-colors"
      style={{ transitionDuration: `${duration.fast}ms` }}
    >
      {night ? "切回日间" : "切换夜间主题"}
    </button>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-section-lg">
      <h2 className="text-headline-lg text-ink">{title}</h2>
      {note ? <p className="mt-xs text-body-sm text-muted">{note}</p> : null}
      <div className="mt-lg">{children}</div>
    </section>
  );
}

export default function DevTokensPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[390px] px-margin-mobile pb-section-lg">
      <header className="pt-xl">
        <p className="text-micro text-muted-soft">DESIGN TOKENS · {DESIGN_VERSION}</p>
        <h1 className="mt-sm text-display-app text-ink">见岸 · token 总览</h1>
        <p className="mt-sm text-body-md text-body">
          全部值由 DESIGN.md frontmatter 经 scripts/build-tokens.ts 生成。本页用于视觉验证 token
          管线与夜间主题。
        </p>
        <div className="mt-lg">
          <ThemeToggle />
        </div>
      </header>

      <Section title="Colors" note="上排日间 / 下排夜间（悬停无交互，纯展示）">
        <div className="grid grid-cols-2 gap-md">
          {Object.entries(colors).map(([name, hex]) => (
            <div key={name} className="rounded-md border border-border bg-surface p-md">
              <div
                className="h-10 w-full rounded-xs border border-border"
                style={{ backgroundColor: hex }}
              />
              <p className="mt-xs text-label-md text-ink">{name}</p>
              <p className="text-caption text-muted">{hex}</p>
            </div>
          ))}
        </div>
        <div className="mt-lg grid grid-cols-2 gap-md">
          {Object.entries(nightColors).map(([name, hex]) => (
            <div key={name} className="rounded-md border border-border-strong bg-surface p-md">
              <div
                className="h-10 w-full rounded-xs border border-border"
                style={{ backgroundColor: hex }}
              />
              <p className="mt-xs text-label-md text-ink">{name}</p>
              <p className="text-caption text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" note="17 级；中文实际字重经 clampCjkFontWeight 钳制">
        <div className="space-y-lg">
          {Object.entries(typography).map(([name, t]) => (
            <div key={name}>
              <p
                className="text-ink"
                style={{
                  fontFamily: t.fontFamily === "stat" ? "var(--ja-font-stat)" : undefined,
                  fontSize: t.fontSize,
                  fontWeight: t.fontWeight,
                  lineHeight: t.lineHeight,
                  letterSpacing: t.letterSpacing,
                }}
              >
                见岸 Aa 0123
              </p>
              <p className="text-caption text-muted">
                {name} · {t.fontSize}px / {t.fontWeight} → 中文 {clampCjkFontWeight(t.fontWeight)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing">
        <div className="space-y-sm">
          {Object.entries(spacing).map(([name, v]) => (
            <div key={name} className="flex items-center gap-md">
              <span className="w-28 text-label-md text-muted">{name}</span>
              <span className="h-sm rounded-full bg-primary-soft" style={{ width: v }} />
              <span className="text-caption text-muted-soft">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-md">
          {Object.entries(rounded).map(([name, v]) => (
            <div
              key={name}
              className="flex h-16 w-16 items-center justify-center border border-border-strong bg-surface-soft text-caption text-muted"
              style={{ borderRadius: Math.min(v, 32) }}
            >
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation" note="90% 内容应为 flat/hairline；lift 仅用于活动层与浮层">
        <div className="grid grid-cols-2 gap-lg">
          {Object.entries(elevation).map(([name, shadow]) => (
            <div
              key={name}
              className="rounded-md bg-surface p-md text-label-md text-ink"
              style={{ boxShadow: shadow === "none" ? undefined : shadow }}
            >
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Motion" note="点击条形触发对应时长与曲线的过渡">
        <MotionDemos />
      </Section>

      <Section title="Depth Model" note="§5.4 四层语义（GAP-1 数值化）：Z0=0 / Z1=10 / Z2=20 / Z3=30">
        <ul className="space-y-xs text-body-sm text-body">
          <li>Z0 Atmosphere = {zIndex.atmosphere}</li>
          <li>Z1 Content = {zIndex.content}</li>
          <li>Z2 Active Context = {zIndex.activeContext}</li>
          <li>Z3 Functional Layer = {zIndex.functional}</li>
        </ul>
      </Section>
    </main>
  );
}

function MotionDemos() {
  const [on, setOn] = useState(false);
  const tiers = Object.entries(duration) as Array<[keyof typeof duration, number]>;
  return (
    <div className="space-y-md">
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className="rounded-sm border border-border-strong bg-surface px-lg py-sm text-button-sm text-ink"
      >
        {on ? "复位" : "播放"}
      </button>
      {tiers.map(([name, ms]) => (
        <div key={name} className="flex items-center gap-md">
          <span className="w-24 text-label-md text-muted">{name}</span>
          <div className="h-sm flex-1 overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: on ? "100%" : "12%",
                transitionProperty: "width",
                transitionDuration: `${ms}ms`,
                transitionTimingFunction:
                  name in easing ? easing[name as keyof typeof easing] : easing.standard,
              }}
            />
          </div>
          <span className="w-16 text-caption text-muted-soft">{ms}ms</span>
        </div>
      ))}
    </div>
  );
}
