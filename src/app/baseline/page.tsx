"use client";

/**
 * Baseline v0 — CL-01 出口屏。
 * §14.2：无证据时不强结论——冷启动显示宽区间与数据量，不显示伪精确分数。
 * F0067/F0068/F0069/F0070/F0072/F0073/F0078。
 */
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore, type BaselineSnapshot } from "@/lib/profile/store";

export default function BaselinePage() {
  const { baseline, profile, imports } = useProfileStore();

  if (!baseline) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-xl pt-xl">
        <EmptyState
          why="还没有成绩数据，无法建立基线。"
          action="导入一次模考截图或手工录入成绩后，这里会出现你的第一版个人基线。"
          cta="去导入成绩"
          onAction={() => (window.location.href = "/import")}
        />
      </main>
    );
  }

  const confidenceTone = baseline.confidence === "高" ? "insight" : ("warning" as const);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-xl pt-xl">
      <header>
        <p className="text-micro text-primary">个人基线 · 第一版</p>
        <h1 className="mt-sm text-headline-xl text-ink">
          {profile.goal ? `距离${profile.goal.examName}还有一段路，先看清起点。` : "先看清起点。"}
        </h1>
        <div className="mt-md flex items-center gap-sm">
          <Chip tone={confidenceTone}>{baseline.confidence === "冷启动" ? "数据不足" : `可信度 ${baseline.confidence}`}</Chip>
          <span className="text-caption text-muted">{baseline.dataNote}</span>
        </div>
      </header>

      <div className="mt-xl space-y-md">
        {baseline.modules.map((m) => (
          <ModuleBaselineRow key={m.id} row={m} />
        ))}
      </div>

      {/* F0048 证据入口：基线由哪些导入构成、各自的解析版本与证据留存状态 */}
      {imports.length > 0 ? (
        <details className="mt-lg rounded-md border border-border bg-surface p-md">
          <summary className="cursor-pointer text-body-sm text-primary">这条基线的数据来源（{imports.length} 次导入）</summary>
          <ul className="mt-sm space-y-sm">
            {[...imports].reverse().slice(0, 6).map((record) => (
              <li key={record.id} className="text-caption text-body">
                <p>{record.examLabel} · {record.source} · {record.importedAt.slice(0, 10)}</p>
                <p className="mt-xxs text-muted">
                  解析版本 {record.sourceRef?.parserVersion ?? "手工录入"} ·
                  {record.sourceRef?.rawEvidence
                    ? ` 原始证据：${record.sourceRef.rawEvidence.startsWith("[") ? record.sourceRef.rawEvidence.slice(1, -1) : "已留存引用"}`
                    : " 未留存原始证据"}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-sm text-micro text-muted-soft">截图留存策略可在「我的 · 数据与隐私」调整；选择确认后自动删除时这里只保留解析指纹。</p>
        </details>
      ) : null}

      <Card className="mt-xl" tone="surface">
        <p className="text-body-sm text-body">
          基线会随每一次训练与模考自动校准。此刻的区间较宽是正常的——证据多了，判断自然会收窄。
        </p>
      </Card>

      <div className="sticky bottom-0 mt-xl bg-canvas pt-md">
        <Link href="/today">
          <Button fullWidth>进入今日</Button>
        </Link>
      </div>
    </main>
  );
}

type BaselineModule = BaselineSnapshot["modules"][number];

function ModuleBaselineRow({ row }: { row: BaselineModule }) {
  const [open, setOpen] = useState(false);
  const hasData = row.accuracy != null;
  const pct = (n: number): string => `${Math.round(n * 100)}%`;
  return (
    <Card as="div">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-title-md text-ink">{row.id}</p>
          {hasData && row.accuracyLow != null && row.accuracyHigh != null ? (
            <p className="mt-xs text-body-sm text-body">
              正确率区间 {pct(row.accuracyLow)} – {pct(row.accuracyHigh)}
              {row.secondsPerQuestion != null ? ` · 约 ${row.secondsPerQuestion} 秒/题` : ""}
            </p>
          ) : (
            <p className="mt-xs text-body-sm text-muted">暂无该模块数据，先不做判断。</p>
          )}
        </div>
        {hasData ? (
          <span className="text-caption text-muted">{row.sampleQuestions} 题</span>
        ) : (
          <Chip tone="neutral">数据不足</Chip>
        )}
      </div>

      {hasData && row.accuracyLow != null && row.accuracyHigh != null ? (
        <div className="mt-md h-2 w-full rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              marginLeft: `${row.accuracyLow * 100}%`,
              width: `${(row.accuracyHigh - row.accuracyLow) * 100}%`,
            }}
          />
        </div>
      ) : null}

      {hasData ? (
        <div className="mt-md">
          <Button variant="tertiary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "收起依据" : "查看依据"}
          </Button>
          {open ? (
            <p className="mt-sm text-caption text-muted">
              区间由每次模考的模块正确率滚动计算；样本 {row.sampleQuestions} 题。数据越多，区间越窄。
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
