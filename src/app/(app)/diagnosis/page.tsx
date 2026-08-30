"use client";

/**
 * Diagnostic Result — §11.4。
 * 层级：一句核心判断 → Top 1–3 提分机会 → 每个机会的证据 → 建议动作 → 置信度/数据覆盖。
 * §11.4 Avoid：不用雷达图；用 ranked opportunity list + horizontal contribution bar +
 * confidence 语言。CTA：一键生成处方（F0101）。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { EvidenceCard } from "@/components/evidence/EvidenceCard";
import { ContributionBars } from "@/components/charts/ContributionBars";
import { useProfileStore } from "@/lib/profile/store";
import { diagnose } from "@/lib/diagnosis/engine";
import { buildPrescription, todayBudget } from "@/lib/prescription/engine";

export default function DiagnosisPage() {
  const router = useRouter();
  const { baseline, profile, diagnosis, setDiagnosis, setPrescription, todayMinutesOverride } =
    useProfileStore();

  // F0081 导入新模考后自动生成诊断候选：基线在但诊断缺失/过期时重算
  useEffect(() => {
    if (!baseline) return;
    if (diagnosis && diagnosis.generatedAt >= baseline.computedAt) return;
    setDiagnosis(diagnose(baseline, profile.goal, profile.conditions));
  }, [baseline, diagnosis, profile.goal, profile.conditions, setDiagnosis]);

  if (!baseline) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <EmptyState
          why="还没有成绩数据，诊断无法开始。"
          action="导入一次模考成绩后，这里会告诉你此刻最值得解决的问题。"
          cta="去导入成绩"
          onAction={() => router.push("/import")}
        />
      </main>
    );
  }

  if (!diagnosis) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl" aria-live="polite">
        <p className="text-body-md text-muted">正在比较你的历史基线…</p>
      </main>
    );
  }

  const generate = (): void => {
    const budget =
      todayMinutesOverride ??
      todayBudget(profile.conditions?.weekdayMinutes ?? 60, profile.conditions?.weekendMinutes ?? 90);
    setPrescription(buildPrescription(diagnosis, budget));
    router.push("/today");
  };

  const bars = diagnosis.opportunities.map((o, i) => ({
    label: `${o.moduleId} · ${o.kind}`,
    value: o.estimatedGain,
    valueText: `约 +${o.estimatedGain} 分 / ${o.estimatedHours} 小时`,
    highlight: i === 0,
  }));

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header>
        <p className="text-micro text-primary">提分诊断</p>
        <h1 className="mt-sm text-headline-xl text-ink">{diagnosis.headline}</h1>
        <div className="mt-md flex flex-wrap items-center gap-sm">
          <Chip tone={diagnosis.confidence === "高" ? "insight" : "warning"}>
            {diagnosis.provisional ? "候选结论 · 证据不足" : `置信度 ${diagnosis.confidence}`}
          </Chip>
          <span className="text-caption text-muted">{baseline.dataNote}</span>
        </div>
      </header>

      {diagnosis.opportunities.length === 0 ? (
        <div className="mt-xl">
          <EmptyState
            why="现有数据还不足以排出提分机会。"
            action="再完成 1 次模考或 2 次专项训练，这里会给出 1–3 个最值得投入的方向。"
          />
        </div>
      ) : (
        <>
          <div className="mt-xl">
            <ContributionBars
              title="提分机会排序"
              caption="按「单位时间预期收益」排序，不是按最弱项排序。"
              rows={bars}
            />
          </div>

          <ol className="mt-xl space-y-lg">
            {diagnosis.opportunities.map((op, i) => (
              <li key={`${op.moduleId}-${op.kind}`}>
                <div className="mb-sm flex items-center gap-sm">
                  <span className="text-label-md text-muted">机会 {i + 1}</span>
                  <Chip tone={i === 0 ? "opportunity" : "neutral"}>{op.kind}</Chip>
                </div>
                <EvidenceCard
                  conclusion={op.headline}
                  evidence={op.evidence}
                  confidence={op.confidence}
                  invalidatedWhen={op.invalidatedWhen}
                  defaultOpen={i === 0}
                />
              </li>
            ))}
          </ol>

          {diagnosis.gapToTarget != null ? (
            <Card className="mt-xl">
              <p className="text-body-sm text-body">
                按目前水平估算，距目标还有约 {diagnosis.gapToTarget} 分。上面 1–3 项合计可覆盖其中约{" "}
                {round1(diagnosis.opportunities.reduce((s, o) => s + o.estimatedGain, 0))} 分。
              </p>
            </Card>
          ) : null}

          <div className="sticky bottom-0 mt-xl bg-canvas pt-md">
            <Button fullWidth onClick={generate}>
              生成今日处方
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
