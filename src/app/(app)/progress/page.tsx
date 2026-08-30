"use client";

/**
 * Progress — §11.9：回答「我是否在正确方向上变好」。
 * 顶部是阶段性判断（一句话），不是大总分。
 * F0277 总分趋势 / F0278 模块趋势 / F0281 与个人基线比较 / F0282 目标距离。
 * §13.3：比较顺序 = 自己的过去 → 目标线 →（可选）群体。
 */
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/StateViews";
import { TrendLine } from "@/components/charts/TrendLine";
import { useProfileStore } from "@/lib/profile/store";
import { MODULES, TOTAL_FULL_SCORE } from "@/lib/profile/types";

export default function ProgressPage() {
  const { imports, baseline, profile } = useProfileStore();

  const exams = useMemo(
    () =>
      imports
        .filter((im) => im.source !== "系统训练")
        .sort((a, b) => a.importedAt.localeCompare(b.importedAt)),
    [imports],
  );

  const summary = useMemo((): string => {
    if (exams.length === 0) return "还没有足够的模考数据来判断方向。";
    const totals = exams.map((e) => e.totalScore).filter((v): v is number => v != null);
    if (totals.length >= 2) {
      const delta = totals[totals.length - 1]! - totals[0]!;
      return delta > 0
        ? `最近 ${exams.length} 次模考总分在上升（+${round1(delta)} 分），方向正确。`
        : delta < 0
          ? `总分较首次回落 ${round1(-delta)} 分；先看模块层，找出波动来自哪里。`
          : `总分与此前持平，变化更多发生在模块层。`;
    }
    return `已记录 ${exams.length} 次模考；再导入 1 次即可看到方向。`;
  }, [exams]);

  const totalTrend = exams
    .filter((e) => e.totalScore != null)
    .map((e) => ({ label: labelOf(e.importedAt), value: e.totalScore! / TOTAL_FULL_SCORE }));

  const moduleSeries = MODULES.map((m) => {
    const pts = exams
      .map((e) => e.modules.find((x) => x.id === m))
      .map((x, i) => ({
        x,
        label: labelOf(exams[i]!.importedAt),
      }))
      .filter(({ x }) => x?.score != null)
      .map(({ x, label }) => ({ label, value: (x!.score! / 40) }));
    return { moduleId: m, points: pts };
  }).filter((s) => s.points.length >= 2);

  const latestModules = exams[exams.length - 1]?.modules ?? [];

  if (exams.length === 0 && !baseline) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">进展</h1>
        <div className="mt-xl">
          <EmptyState
            why="还没有足够数据形成趋势。"
            action="完成 2 次模考或 3 次专项训练后，这里会开始出现你的个人基线与趋势。"
            cta="去导入成绩"
            onAction={() => (window.location.href = "/import")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">进展</h1>
      <p className="mt-sm text-body-md text-body">{summary}</p>
      {profile.goal ? (
        <p className="mt-xs text-caption text-muted">
          目标 {profile.goal.targetTotal} 分
          {baseline
            ? ` · 当前估算 ${round1(
                baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0),
              )} 分 · 差距 ${round1(
                profile.goal.targetTotal -
                  baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0),
              )} 分`
            : ""}
        </p>
      ) : null}

      <div className="mt-xl space-y-lg">
        {totalTrend.length >= 2 ? (
          <TrendLine
            title="总分趋势"
            points={totalTrend}
            unit=""
            baseline={
              baseline
                ? baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0) /
                  TOTAL_FULL_SCORE
                : null
            }
            height={140}
          />
        ) : null}

        {moduleSeries.length > 0 ? (
          <section>
            <h2 className="text-title-lg text-ink">模块趋势</h2>
            <p className="mt-xs text-caption text-muted">正确率按场次；虚线为该模块个人基线。</p>
            <div className="mt-md space-y-lg">
              {moduleSeries.map((s) => (
                <TrendLine
                  key={s.moduleId}
                  title={s.moduleId}
                  points={s.points}
                  unit="%"
                  baseline={baseline?.modules.find((m) => m.id === s.moduleId)?.accuracy ?? null}
                  height={100}
                />
              ))}
            </div>
          </section>
        ) : null}

        {latestModules.length > 0 && baseline ? (
          <Card>
            <p className="text-label-md text-muted">最近一次 vs 个人基线</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {latestModules.map((m) => {
                const b = baseline.modules.find((x) => x.id === m.id)?.accuracy;
                if (m.score == null || b == null) return null;
                const delta = Math.round((m.score / fullOf(m.id) - b) * 100);
                return (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.id}</span>
                    <span className={delta >= 0 ? "text-success" : "text-warning"}>
                      {delta >= 0 ? `+${delta}` : delta} 个百分点
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card className="text-center">
          <Link href="/progress/weekly" className="text-label-md text-primary">
            查看本周复盘 ›
          </Link>
        </Card>
      </div>
    </main>
  );
}

function labelOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fullOf(id: string): number {
  const map: Record<string, number> = {
    言语理解: 40,
    判断推理: 40,
    数量关系: 15,
    资料分析: 20,
    常识判断: 20,
  };
  return map[id] ?? 20;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
