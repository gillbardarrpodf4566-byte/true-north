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

const TIME_CHOICES = [20, 40, 60, 90];

export default function TodayPage() {
  const router = useRouter();
  const {
    profile,
    baseline,
    diagnosis,
    prescription,
    taskResults,
    todayMinutesOverride,
    setDiagnosis,
    setPrescription,
    setTodayMinutesOverride,
    lastRevealDate,
    markRevealed,
  } = useProfileStore();

  const today = isoDate(new Date());
  const [showTimeSheet, setShowTimeSheet] = useState(false);

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
      setPrescription(buildPrescription(diagnosis, budget, new Date(), reason));
    }
  }, [diagnosis, prescription, budget, today, setPrescription]);

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
  const top = diagnosis?.opportunities[0];

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <Header daysLeft={daysLeft} />

      {/* Above the fold：单一焦点（§9.1 Primary choice = 1） */}
      <div className="mt-lg">
        <HorizonFocus
          indicatorPosition={indicatorFor(diagnosis?.confidence)}
          conclusion={diagnosis?.headline ?? "正在读取你的基线…"}
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
          {prescription?.tasks.map((t) => (
            <PrescriptionCard
              key={t.id}
              task={t}
              result={resultFor(t.id)}
              href={`/train/session/${t.id}`}
            />
          ))}
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
