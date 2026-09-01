"use client";

/**
 * Diagnostic Result — §11.4。
 * 层级：一句核心判断 → Top 1–3 提分机会 → 每个机会的证据 → 建议动作 → 置信度/数据覆盖。
 * §11.4 Avoid：不用雷达图；用 ranked opportunity list + horizontal contribution bar +
 * confidence 语言。CTA：一键生成处方（F0101）。
 */
import { useEffect, useMemo, useState } from "react";
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
import { counterfactualExplanation, diagnosisDelta, diagnosisStale, impactBand, stabilityOpportunity } from "@/lib/insights/v1";
import { computeAbilityDimensions } from "@/lib/ability/dimensions";

export default function DiagnosisPage() {
  const router = useRouter();
  const { baseline, profile, diagnosis, diagnosisHistory, profileCorrections, setDiagnosis, setPrescription, todayMinutesOverride, aiFeedback, addAiFeedback, attemptRecords } =
    useProfileStore();
  // F0090：稳定性本身也是一个机会点，与模块正确率机会并列展示
  const stability = useMemo(() => stabilityOpportunity(computeAbilityDimensions(attemptRecords)), [attemptRecords]);
  const [disagreeOpen, setDisagreeOpen] = useState(false);
  const [supplement, setSupplement] = useState("");
  const [supplementSent, setSupplementSent] = useState(false);

  // F0081/F0103：诊断缺失时直接生成；已有诊断被新数据超越时不静默覆盖，
  // 先告知结论已过期，由用户决定何时用新数据重算。
  const stale = Boolean(baseline && diagnosis && diagnosisStale(diagnosis.generatedAt, baseline.computedAt));
  useEffect(() => {
    if (!baseline || diagnosis) return;
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

  // F0082 手动诊断：用户主动重新生成当前阶段诊断
  const reDiagnose = (): void => {
    setDiagnosis(diagnose(baseline, profile.goal, profile.conditions, new Date()));
  };

  // F0319/F0178：AI 结果反馈（进入质量评测闭环 CL-10）
  const giveFeedback = (helpful: boolean): void => {
    addAiFeedback({ target: `diagnosis:${diagnosis.generatedAt}`, helpful, reported: false, reason: "" });
  };
  const feedbackGiven = aiFeedback.some((f) => f.target === `diagnosis:${diagnosis.generatedAt}`);

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
          <Button variant="tertiary" onClick={reDiagnose} className="ml-auto">
            重新诊断
          </Button>
        </div>
        {/* F0103 结论有效期：过期不静默覆盖，明确告知并交由用户决定 */}
        {stale ? (
          <div role="status" className="mt-md rounded-md border border-warning bg-warning-soft p-md">
            <p className="text-body-sm text-ink">已有更新的成绩数据，这条结论可能已过期。重新诊断前不会自动改写它。</p>
            <Button className="mt-sm" variant="secondary" onClick={reDiagnose}>
              用新数据重新诊断
            </Button>
          </div>
        ) : null}

        {/* F0319：对诊断结论本身的反馈 */}
        <div className="mt-sm flex items-center gap-sm">
          <span className="text-caption text-muted">这个判断对你有帮助吗？</span>
          {feedbackGiven ? (
            <span className="text-caption text-success">已记录，谢谢。</span>
          ) : (
            <>
              <Button variant="tertiary" onClick={() => giveFeedback(true)}>
                有帮助
              </Button>
              <Button variant="tertiary" onClick={() => giveFeedback(false)}>
                没帮助
              </Button>
            </>
          )}
        </div>
        {profileCorrections.length > 0 ? <p className="mt-xs text-caption text-muted">已参考你最近的画像说明：「{profileCorrections[profileCorrections.length - 1]!.userSays}」</p> : null}
        {/* F0099 不认同：选择原因后记录，不能静默覆盖 */}
        <div className="mt-sm">
          <button type="button" onClick={() => setDisagreeOpen((v) => !v)} aria-expanded={disagreeOpen} className="text-caption text-muted underline-offset-2 hover:underline">
            我不认同这个判断
          </button>
          {disagreeOpen ? (
            <div className="mt-sm rounded-md bg-surface-soft p-md">
              <p className="text-caption text-muted">哪一项不符合？你的反馈会用于校准。</p>
              <div className="mt-sm flex flex-wrap gap-sm">
                {["数据不完整", "我更想先练别的", "这个原因不准确", "其他"].map((reason) => (
                  <button key={reason} type="button" onClick={() => { addAiFeedback({ target: `diagnosis:${diagnosis.generatedAt}`, helpful: false, reported: false, reason }); setDisagreeOpen(false); }} className="rounded-full border border-border bg-surface px-md py-sm text-caption text-body">
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {/* F0100 证据不足时追问最少必要信息 */}
        {diagnosis.provisional ? (
          <div className="mt-md rounded-md border border-border bg-surface-soft p-md">
            <p className="text-body-sm text-body">为了减少误判，你最近一次资料分析训练是在哪个时段完成的？</p>
            <div className="mt-sm flex gap-sm">
              <input value={supplement} onChange={(e) => setSupplement(e.target.value)} aria-label="补充训练时段" placeholder="如 晚上 21:00" className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" />
              <Button variant="secondary" disabled={!supplement.trim()} onClick={() => { addAiFeedback({ target: `diagnosis-supplement:${diagnosis.generatedAt}`, helpful: null, reported: false, reason: supplement.trim() }); setSupplementSent(true); }}>{supplementSent ? "已记录" : "补充"}</Button>
            </div>
          </div>
        ) : null}
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
          {/* F0090 稳定性机会：波动本身是可提分项，与模块机会并列 */}
          {stability ? (
            <Card className="mt-lg" tone="faint">
              <p className="text-label-md text-muted">稳定性机会（F0090）</p>
              <p className="mt-xs text-body-sm text-body">{stability.moduleId}：{stability.note}</p>
            </Card>
          ) : null}
          {diagnosis.opportunities[0] ? (
            <Card className="mt-lg" tone="surface">
              <p className="text-label-md text-muted">预计影响（F0098）</p>
              <p className="mt-xs text-body-sm text-body">{impactBand(diagnosis.opportunities[0].estimatedGain).text} · 置信 {diagnosis.opportunities[0].confidence}</p>
              {diagnosis.opportunities.length > 1 ? (
                <p className="mt-sm text-caption text-muted">
                  {counterfactualExplanation(diagnosis.opportunities, diagnosis.opportunities[diagnosis.opportunities.length - 1]?.moduleId ?? null)}
                </p>
              ) : null}
            </Card>
          ) : null}
          {diagnosisHistory.length >= 2 ? (
            <Card className="mt-lg" padding="dense">
              <p className="text-label-md text-muted">诊断版本变化（F0102/F0103）</p>
              <p className="mt-xs text-body-sm text-body">{diagnosisDelta(diagnosisHistory).text}</p>
            </Card>
          ) : null}

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
