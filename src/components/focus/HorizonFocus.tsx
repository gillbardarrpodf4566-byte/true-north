"use client";

/**
 * HorizonFocus — §2.4 品牌 Signature Moment 01 + §7.4 Focus Card 结构。
 *
 * 六元素：micro-label「今日焦点」/ horizon indicator / 1–2 行核心判断 /
 * 一句证据摘要 / Primary CTA / Secondary「为什么」。
 *
 * §8.9 Horizon Reveal 逐帧时间轴（当天首次进入才完整播放）：
 *   0–120ms 卡面 fade in；80–360ms 地平线由中心向两侧展开；
 *   160–420ms 状态点出现并 settle；220–480ms 核心结论上移 6px；
 *   300–560ms CTA 与「为什么」出现。
 * 同一天二次进入只做短 fade（fast 档）；prefers-reduced-motion 下全部改为直接显示。
 */
import { useEffect, useState, type ReactNode } from "react";
import { duration, easing } from "@/design/tokens";

interface Props {
  label?: string;
  /** 状态点在地平线上的横向位置（0–1），表达当前状态而非分数 */
  indicatorPosition?: number;
  conclusion: ReactNode;
  evidenceSummary: string;
  primary: ReactNode;
  secondary?: ReactNode;
  /** 当天是否已播放过完整 Reveal */
  alreadyRevealedToday: boolean;
  onRevealed?: () => void;
}

export function HorizonFocus({
  label = "今日焦点",
  indicatorPosition = 0.5,
  conclusion,
  evidenceSummary,
  primary,
  secondary,
  alreadyRevealedToday,
  onRevealed,
}: Props) {
  const reduce = usePrefersReducedMotion();
  const full = !alreadyRevealedToday && !reduce;
  // 阶段：0 未开始 → 1 卡面 → 2 地平线 → 3 状态点 → 4 结论 → 5 CTA
  const [phase, setPhase] = useState(full ? 0 : 5);

  useEffect(() => {
    if (!full) return;
    const timers = [
      setTimeout(() => setPhase(1), 0),
      setTimeout(() => setPhase(2), 80),
      setTimeout(() => setPhase(3), 160),
      setTimeout(() => setPhase(4), 220),
      setTimeout(() => setPhase(5), 300),
      setTimeout(() => onRevealed?.(), duration.hero),
    ];
    return () => timers.forEach(clearTimeout);
  }, [full, onRevealed]);

  const at = (p: number): boolean => phase >= p;
  const ease = easing.emphasized;

  return (
    <section
      aria-label={label}
      className="relative overflow-hidden rounded-xl bg-primary-faint p-6"
      style={{
        opacity: at(1) ? 1 : 0,
        transition: `opacity ${reduce ? duration.instant : duration.feedback}ms ${ease}`,
      }}
    >
      {/* 地平线：由中心向两侧展开（不是圆环仪表，§2.4） */}
      <div className="pointer-events-none absolute inset-x-6 top-[42%]" aria-hidden="true">
        <div
          className="mx-auto h-px bg-horizon-glow/60"
          style={{
            width: at(2) ? "100%" : "0%",
            transition: `width ${reduce ? 0 : duration.content}ms ${ease}`,
          }}
        />
        <div
          className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-primary"
          style={{
            left: `${Math.min(96, Math.max(2, indicatorPosition * 100))}%`,
            opacity: at(3) ? 1 : 0,
            transform: at(3) ? "scale(1)" : "scale(0.6)",
            transition: `opacity ${duration.state}ms ${ease}, transform ${duration.state}ms ${ease}`,
          }}
        />
      </div>

      <p className="relative text-micro text-primary">{label}</p>

      <div
        className="relative mt-lg"
        style={{
          opacity: at(4) ? 1 : 0,
          transform: at(4) ? "translateY(0)" : "translateY(6px)",
          transition: `opacity ${duration.content}ms ${ease}, transform ${duration.content}ms ${ease}`,
        }}
      >
        <div className="text-title-lg text-ink">{conclusion}</div>
        <p className="mt-sm text-body-sm text-body">{evidenceSummary}</p>
      </div>

      <div
        className="relative mt-xl flex flex-col gap-sm"
        style={{
          opacity: at(5) ? 1 : 0,
          transition: `opacity ${duration.content}ms ${ease}`,
        }}
      >
        {primary}
        {secondary}
      </div>
    </section>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}
