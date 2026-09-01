"use client";

/** 申论报告 — F0224 趋势 / F0225 高频问题 / F0226 专项处方。 */
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { TrendLine } from "@/components/charts/TrendLine";
import { useProfileStore } from "@/lib/profile/store";
import { buildEssayReport } from "@/lib/essay/rewrite";
import { usePublishedEssays } from "@/lib/essay/usePublished";

export default function EssayReportPage() {
  const essaySubmissions = useProfileStore((s) => s.essaySubmissions);
  const essayGrades = useProfileStore((s) => s.essayGrades);
  const { essays } = usePublishedEssays();

  const report = useMemo(() => {
    const typeById = Object.fromEntries(essays.map((item) => [item.question.id, item.question.type]));
    return buildEssayReport(essaySubmissions, essayGrades, typeById);
  }, [essaySubmissions, essayGrades, essays]);

  if (essaySubmissions.length === 0) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">申论报告</h1>
        <div className="mt-xl">
          <EmptyState
            why="还没有作答数据。"
            action="完成 1–2 次作答与重写后，这里会给出趋势、高频问题与下周专项处方。"
            cta="去练习"
            onAction={() => (window.location.href = "/essay")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">申论报告</h1>

      {/* F0224 趋势 */}
      <section className="mt-xl space-y-lg">
        {report.trends
          .filter((t) => t.points.length >= 2)
          .map((t) => (
            <TrendLine
              key={t.label}
              title={t.label}
              points={t.points.map((p) => ({ label: p.label, value: p.value / 100 }))}
              unit="%"
              height={110}
            />
          ))}
        {report.trends.every((t) => t.points.length < 2) ? (
          <Card>
            <p className="text-body-sm text-body">
              单次作答暂不成趋势；对同一题完成一次「重写」，或再做一题后这里会出现曲线。
            </p>
          </Card>
        ) : null}
      </section>

      {/* F0225 高频问题 */}
      {report.frequentIssues.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">高频问题</h2>
          <ul className="mt-md space-y-sm">
            {report.frequentIssues.map((f) => (
              <li key={f.title} className="flex items-center justify-between rounded-md border border-border bg-surface p-md">
                <span className="text-body-sm text-body">{f.title}</span>
                <Chip tone={f.count >= 2 ? "warning" : "neutral"}>{f.count} 次</Chip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* F0226 专项处方 */}
      {report.nextWeekPlan.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">下周专项处方</h2>
          <ul className="mt-md space-y-md">
            {report.nextWeekPlan.map((p) => (
              <li key={p.title} className="rounded-lg border border-border bg-surface p-lg">
                <p className="text-body-md text-ink">{p.title}</p>
                <p className="mt-xs text-caption text-muted">
                  预计 {p.minutes} 分钟 · {p.successCriteria}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card className="mt-xl text-center">
        <Link href="/essay" className="text-label-md text-primary">
          返回申论教练 ›
        </Link>
      </Card>
    </main>
  );
}
