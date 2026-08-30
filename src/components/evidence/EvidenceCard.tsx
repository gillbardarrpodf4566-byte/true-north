"use client";

/**
 * EvidenceCard — §7.5：结论 / 依据数据 / 对比基线 / 置信度与数据量 / 查看完整证据。
 * §9.5 Trust Calibration：事实与推断分层标注，不靠颜色区分。
 * §8.11 展开时卡片向下扩展，evidence sections 40–60ms stagger。
 */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { duration, easing } from "@/design/tokens";
import type { Evidence } from "@/lib/diagnosis/engine";

export function EvidenceCard({
  conclusion,
  evidence,
  confidence,
  invalidatedWhen,
  defaultOpen = false,
}: {
  conclusion: string;
  evidence: Evidence[];
  confidence: "高" | "中" | "低";
  invalidatedWhen?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-border bg-surface p-lg">
      <div className="flex items-start justify-between gap-md">
        <p className="text-body-md text-ink">{conclusion}</p>
        <Chip tone={confidence === "高" ? "insight" : "warning"}>
          {confidence === "高" ? "高置信" : confidence === "中" ? "中等证据" : "数据不足"}
        </Chip>
      </div>

      <div className="mt-md">
        <Button variant="tertiary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "收起依据" : "查看依据"}
        </Button>
      </div>

      {open ? (
        <dl className="mt-md space-y-sm">
          {evidence.map((e, i) => (
            <div
              key={e.label}
              className="rounded-sm bg-surface-soft p-md"
              style={{
                animation: `none`,
                opacity: 1,
                transitionDelay: `${i * 50}ms`,
                transitionDuration: `${duration.state}ms`,
                transitionTimingFunction: easing.enter,
              }}
            >
              <dt className="flex items-center gap-sm text-label-md text-muted">
                <span>{e.label}</span>
                <span className="rounded-full border border-border px-xs text-micro text-muted-soft">
                  {e.kind}
                </span>
              </dt>
              <dd className="mt-xs text-body-sm text-body">{e.detail}</dd>
            </div>
          ))}
          {invalidatedWhen ? (
            <div className="rounded-sm bg-surface-soft p-md">
              <dt className="text-label-md text-muted">什么会推翻这个判断</dt>
              <dd className="mt-xs text-body-sm text-body">{invalidatedWhen}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
