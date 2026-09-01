"use client";

/**
 * Today — §11.2。
 * Above the fold：日期 / greeting → Horizon Focus → 今日主任务 CTA
 * Second fold：今日处方 2–4 项 / 本周节奏 / 一条值得关注的趋势
 * Visual Rule：首页最多一个大数字；Focus 重排序但位置不变。
 *
 * 覆盖：F0050 今日状态 / F0051 首要任务 / F0052 状态原因 / F0053 处方 /
 * F0054 可用时间适配 / F0055 倒计时 / F0056 目标进度 / F0057 一键进入 /
 * F0059 任务解释 / F0062 风险提醒 / F0064 快速导入 / F0065 问教练 / F0066 趋势。
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { HorizonFocus } from "@/components/focus/HorizonFocus";
import { PrescriptionCard } from "@/components/prescription/PrescriptionCard";
import { useProfileStore } from "@/lib/profile/store";
import { diagnose } from "@/lib/diagnosis/engine";
import { buildPrescription, todayBudget } from "@/lib/prescription/engine";
import { checkGoalConflicts } from "@/lib/profile/conflicts";
import { computeAbilityDimensions } from "@/lib/ability/dimensions";
import { enhancePrescription, lightenTask, replacementFor } from "@/lib/plan/adaptive";

const TIME_CHOICES = [20, 40, 60, 90];

export default function TodayPage() {
  const router = useRouter();
  const {
    profile,
    baseline,
    diagnosis,
    prescription,
    taskResults,
    attemptRecords,
    privacy,
    todayMinutesOverride,
    setDiagnosis,
    setPrescription,
    setTodayMinutesOverride,
    lastRevealDate,
    markRevealed,
    postponedTasks,
    postponeTask,
    addTaskAdjustment,
  } = useProfileStore();
  const [adjustTask, setAdjustTask] = useState<string | null>(null);

  const today = isoDate(new Date());
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [replacementTask, setReplacementTask] = useState<string | null>(null);
  const [lightTask, setLightTask] = useState<string | null>(null);

  const defaultBudget = todayBudget(
    profile.conditions?.weekdayMinutes ?? 60,
    profile.conditions?.weekendMinutes ?? 90,
  );
  const budget = todayMinutesOverride ?? defaultBudget;

  // 诊断与处方按需生成/刷新（CL-02 step1-2）
  useEffect(() => {
    if (!baseline) return;
    if (!diagnosis || diagnosis.generatedAt < baseline.computedAt) {
      setDiagnosis(diagnose(baseline, profile.goal, profile.conditions));
    }
  }, [baseline, diagnosis, profile.goal, profile.conditions, setDiagnosis]);

  useEffect(() => {
    if (!diagnosis) return;
    const stale =
      !prescription ||
      prescription.generatedAt < diagnosis.generatedAt ||
      prescription.budgetMinutes !== budget ||
      !isoDate(new Date(prescription.generatedAt)).startsWith(today);
    if (stale) {
      const reason =
        prescription && prescription.budgetMinutes !== budget
          ? `你今天可用时间改为 ${budget} 分钟，任务量已按此重排。`
          : null;
      const ability = computeAbilityDimensions(attemptRecords);
      setPrescription(enhancePrescription(buildPrescription(diagnosis, budget, new Date(), reason), ability));
    }
  }, [diagnosis, prescription, budget, today, setPrescription, attemptRecords]);

  const daysLeft = useMemo(() => {
    if (!profile.goal?.examDate) return null;
    const diff = Math.ceil(
      (new Date(profile.goal.examDate).getTime() - Date.now()) / 86_400_000,
    );
    return diff;
  }, [profile.goal?.examDate]);

  if (!baseline) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <Header daysLeft={daysLeft} />
        <div className="mt-xl">
          <EmptyState
            why="还没有你的成绩数据，今天最重要的判断还出不来。"
            action="导入一次模考成绩后，这里会告诉你今天最值得解决什么。"
            cta="去导入成绩"
            onAction={() => router.push("/import")}
          />
        </div>
      </main>
    );
  }

  const firstTask = prescription?.tasks[0];
  const resultFor = (id: string) => taskResults.find((r) => r.taskId === id);
  // F0329：关闭个性化后不再以行为轨迹排序今日焦点；只保留用户明确目标和基础计划。
  const top = privacy.personalization ? diagnosis?.opportunities[0] : null;
  const focusConclusion = privacy.personalization
    ? diagnosis?.headline ?? "正在读取你的基线…"
    : "个性化推荐已关闭。今天按你明确设置的基础计划推进即可。";
  const goalConflicts = profile.goal && profile.conditions
    ? checkGoalConflicts({
        examDate: profile.goal.examDate,
        targetTotal: profile.goal.targetTotal,
        weekdayMinutes: profile.conditions.weekdayMinutes,
        weekendMinutes: profile.conditions.weekendMinutes,
        today: new Date(),
      })
    : [];
  // F0117：延后的任务今天不再显示
  const postponedToday = postponedTasks[today] ?? [];
  const visibleTasks = (prescription?.tasks ?? []).filter(
    (t) => !postponedToday.includes(t.id),
  );

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <Header daysLeft={daysLeft} />

      {/* Above the fold：单一焦点（§9.1 Primary choice = 1） */}
      <div className="mt-lg">
        <HorizonFocus
          indicatorPosition={indicatorFor(diagnosis?.confidence)}
          conclusion={focusConclusion}
          evidenceSummary={
            top
              ? `预计可提约 ${top.estimatedGain} 分；${baseline.dataNote}`
              : baseline.dataNote
          }
          alreadyRevealedToday={lastRevealDate === today}
          onRevealed={() => markRevealed(today)}
          primary={
            firstTask ? (
              <Link href={`/train/session/${firstTask.id}`}>
                <Button fullWidth>开始 {firstTask.minutes} 分钟训练</Button>
              </Link>
            ) : (
              <Link href="/diagnosis">
                <Button fullWidth>查看提分诊断</Button>
              </Link>
            )
          }
          secondary={
            <Link href="/diagnosis">
              <Button variant="tertiary" fullWidth>
                为什么是这个？
              </Button>
            </Link>
          }
        />
      </div>

      {/* Second fold：今日处方 */}
      <section className="mt-section">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-lg text-ink">今日处方</h2>
          <button
            type="button"
            onClick={() => setShowTimeSheet((v) => !v)}
            className="text-label-md text-primary"
            aria-expanded={showTimeSheet}
          >
            今天只有 {budget} 分钟？
          </button>
        </div>

        {showTimeSheet ? (
          <div className="mt-md flex flex-wrap gap-sm" role="group" aria-label="今日可用时间">
            {TIME_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={budget === m}
                onClick={() => {
                  setTodayMinutesOverride(m);
                  setShowTimeSheet(false);
                }}
                className={`rounded-full border px-md py-sm text-label-md ${
                  budget === m
                    ? "border-primary bg-primary-faint text-primary-active"
                    : "border-border bg-surface text-muted"
                }`}
              >
                {m} 分钟
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setTodayMinutesOverride(null);
                setShowTimeSheet(false);
              }}
              className="rounded-full border border-border bg-surface px-md py-sm text-label-md text-muted"
            >
              恢复默认（{defaultBudget}）
            </button>
          </div>
        ) : null}

        {prescription?.changeReason ? (
          <p className="mt-md text-caption text-muted">{prescription.changeReason}</p>
        ) : null}

        <div className="mt-md space-y-md">
          {visibleTasks.map((t) => (
            <div key={t.id}>
              <PrescriptionCard
                task={t}
                result={resultFor(t.id)}
                href={`/train/session/${t.id}`}
              />
              {/* F0117 延后任务：一键移至次日并重排 */}
              {!resultFor(t.id) ? (
                <div className="mt-xs flex flex-wrap gap-md">
                  {t.priority !== "必须" ? (
                    <button
                      type="button"
                      onClick={() => postponeTask(today, t.id)}
                      className="text-caption text-muted underline-offset-2 hover:underline"
                    >
                      今天做不完？放到明天
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setAdjustTask(adjustTask === t.id ? null : t.id)} className="text-caption text-primary underline-offset-2 hover:underline">
                    任务不合适？调整
                  </button>
                  <button type="button" onClick={() => setLightTask(lightTask === t.id ? null : t.id)} className="text-caption text-primary underline-offset-2 hover:underline">
                    生成轻量版
                  </button>
                  <button type="button" onClick={() => setReplacementTask(replacementTask === t.id ? null : t.id)} className="text-caption text-primary underline-offset-2 hover:underline">
                    换一种练法
                  </button>
                </div>
              ) : null}
              {lightTask === t.id ? (
                <div className="mt-sm rounded-md bg-surface-soft p-md">
                  {(() => {
                    const light = lightenTask(t);
                    return <><p className="text-caption text-muted">轻量版（F0118）</p><p className="mt-xs text-body-sm text-body">{light.title} · {light.minutes} 分钟 / {light.questionCount} 题</p><p className="mt-xs text-caption text-muted">{light.successCriteria}</p><Link href={`/train/session/${light.id}`} className="mt-sm inline-block text-label-md text-primary">开始轻量版 →</Link></>;
                  })()}
                </div>
              ) : null}
              {replacementTask === t.id ? (
                <div className="mt-sm rounded-md bg-surface-soft p-md">
                  {(() => {
                    const alt = replacementFor(t, diagnosis);
                    return alt ? <><p className="text-caption text-muted">替代任务（F0058）</p><p className="mt-xs text-body-sm text-body">{alt.title}</p><p className="mt-xs text-caption text-muted">{alt.why}</p><Link href={`/train/session/${alt.id}`} className="mt-sm inline-block text-label-md text-primary">使用这个替代任务 →</Link></> : <p className="text-caption text-muted">当前没有同模块的等价替代机会，建议先缩短任务。</p>;
                  })()}
                </div>
              ) : null}
              {adjustTask === t.id ? (
                <div className="mt-sm rounded-md bg-surface-soft p-md">
                  <p className="text-caption text-muted">未完成原因（F0116）</p>
                  <div className="mt-sm flex flex-wrap gap-sm">
                    {(["时间不足", "太难", "计划不合理", "其他"] as const).map((reason) => (
                      <button key={reason} type="button" onClick={() => { addTaskAdjustment({ taskId: t.id, reason, change: reason === "时间不足" ? "下次生成轻量版任务" : reason === "太难" ? "下次难度下调一档" : reason === "计划不合理" ? "下次重排并缩短单次时长" : "保持原计划" }); setAdjustTask(null); }} className="rounded-full border border-border bg-surface px-md py-sm text-caption text-body">{reason}</button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {visibleTasks.length === 0 ? (
            <p className="text-body-sm text-muted">
              今天的任务都完成或延后了。休息也是计划的一部分。
            </p>
          ) : null}
        </div>
      </section>

      {/* 目标进度与倒计时（F0055/F0056） */}
      {profile.goal ? (
        <Card className="mt-section">
          <p className="text-label-md text-muted">目标</p>
          <p className="mt-xs text-body-md text-body">
            {profile.goal.examName} · {profile.goal.region} · 目标 {profile.goal.targetTotal} 分
          </p>
          {diagnosis?.gapToTarget != null ? (
            <p className="mt-xs text-body-sm text-muted">
              按目前水平估算，距目标还差约 {diagnosis.gapToTarget} 分。
            </p>
          ) : null}
        </Card>
      ) : null}

      {goalConflicts.length > 0 ? (
        <Card className="mt-lg">
          <p className="text-label-md text-warning">目标与时间提醒</p>
          <ul className="mt-sm space-y-xs text-body-sm text-body">
            {goalConflicts.map((c) => <li key={c.kind}>· {c.message} <span className="text-primary">（{c.action}）</span></li>)}
          </ul>
        </Card>
      ) : null}

      {/* 风险提醒（F0062）：仅在有行动价值时出现（§19） */}
      {daysLeft != null && daysLeft <= 30 ? (
        <Card className="mt-lg" tone="surface">
          <div className="flex items-center gap-sm">
            <Chip tone="warning">临近考试</Chip>
            <p className="text-body-sm text-body">剩余 {daysLeft} 天，处方已偏向高收益项。</p>
          </div>
        </Card>
      ) : null}

      {/* 快捷入口（F0064/F0065/F0066） */}
      <nav aria-label="快捷入口" className="mt-section grid grid-cols-3 gap-sm">
        <QuickLink href="/import" label="导入成绩" />
        <QuickLink href="/coach" label="问教练" />
        <QuickLink href="/progress" label="看趋势" />
      </nav>
    </main>
  );
}

function Header({ daysLeft }: { daysLeft: number | null }) {
  return (
    <header>
      <p className="text-caption text-muted">
        {formatDate(new Date())}
        {daysLeft != null ? ` · 距考试 ${daysLeft} 天` : ""}
      </p>
      <p className="mt-xs text-body-md text-body">{greeting()}</p>
    </header>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-surface px-md py-md text-center text-label-md text-ink"
    >
      {label}
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，今天不追求量，只求一件事做完。";
  if (h < 12) return "早上好，今天先解决一件事。";
  if (h < 18) return "下午好，按计划推进就够了。";
  return "晚上好，还有时间完成今天的重点。";
}

function indicatorFor(confidence: "高" | "中" | "低" | undefined): number {
  if (confidence === "高") return 0.72;
  if (confidence === "中") return 0.5;
  return 0.3;
}

function formatDate(d: Date): string {
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
