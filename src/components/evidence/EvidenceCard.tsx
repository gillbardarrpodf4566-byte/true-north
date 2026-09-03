"use client";

/**
 * EvidenceCard — §7.5：结论 / 依据数据 / 对比基线 / 置信度与数据量 / 查看完整证据。
 * §9.5 Trust Calibration：事实与推断分层标注，不靠颜色区分。
 * §8.11 展开时卡片向下扩展；证据以 inset rows 展示，不在卡片里再套小卡片。
 */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
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
    <article className="overflow-hidden rounded-md bg-surface shadow-card-rest">
      <div className="p-lg">
        <div className="flex items-start justify-between gap-md">
          <p className="text-body-md text-ink">{conclusion}</p>
          <Chip tone={confidence === "高" ? "insight" : "warning"}>
            {confidence === "高" ? "高置信" : confidence === "中" ? "中等证据" : "数据不足"}
          </Chip>
        </div>
        <Button className="mt-md" variant="tertiary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? "收起依据" : "查看依据"}
        </Button>
      </div>

      {open ? (
        <dl className="border-t border-separator bg-surface-soft px-lg">
          {evidence.map((item) => (
            <div key={item.label} className="ja-row py-md">
              <dt className="flex items-center gap-sm text-label-md text-muted">
                <span>{item.label}</span>
                <span className="rounded-full bg-material-fill-strong px-sm py-micro text-micro text-muted">
                  {item.kind}
                </span>
              </dt>
              <dd className="mt-xs text-body-sm text-body">{item.detail}</dd>
            </div>
          ))}
          {invalidatedWhen ? (
            <div className="ja-row py-md">
              <dt className="text-label-md text-muted">什么会推翻这个判断</dt>
              <dd className="mt-xs text-body-sm text-body">{invalidatedWhen}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}
