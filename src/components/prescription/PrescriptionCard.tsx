"use client";

/**
 * PrescriptionCard — §7.6：任务卡不是 todo list，而是「处方单元」。
 * 必含：任务名 / 预估时间 / 目标能力 / 为什么今天做 / 成功判定 / 开始按钮。
 * 完成后折叠为 compact success state，并展示真实结果（F0115）。
 */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { PrescriptionTask } from "@/lib/prescription/engine";
import type { TaskResult } from "@/lib/profile/store";

const priorityTone = { 必须: "opportunity", 推荐: "insight", 可选: "neutral" } as const;

export function PrescriptionCard({
  task,
  result,
  href,
}: {
  task: PrescriptionTask;
  result?: TaskResult;
  href: string;
}) {
  if (result) {
    return (
      <article className="rounded-lg border border-border bg-surface p-lg">
        <div className="flex items-center justify-between gap-md">
          <p className="text-body-md text-ink">{task.title}</p>
          <Chip tone={result.metCriteria ? "insight" : "warning"}>
            {result.metCriteria ? "已达标" : "已完成 · 未达标"}
          </Chip>
        </div>
        <p className="mt-xs text-body-sm text-body">
          实际用时 {result.minutes} 分钟
          {result.questions != null && result.correct != null
            ? ` · ${result.correct}/${result.questions} 题正确（${Math.round(
                (result.correct / Math.max(result.questions, 1)) * 100,
              )}%）`
            : ""}
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-lg">
      <div className="flex items-start justify-between gap-md">
        <h3 className="text-title-md text-ink">{task.title}</h3>
        <Chip tone={priorityTone[task.priority]}>{task.priority}</Chip>
      </div>

      <dl className="mt-md space-y-xs text-body-sm">
        <div className="flex gap-sm">
          <dt className="w-20 shrink-0 text-muted">预估时间</dt>
          <dd className="text-body">{task.minutes} 分钟</dd>
        </div>
        <div className="flex gap-sm">
          <dt className="w-20 shrink-0 text-muted">目标能力</dt>
          <dd className="text-body">{task.targetAbility}</dd>
        </div>
        <div className="flex gap-sm">
          <dt className="w-20 shrink-0 text-muted">为什么今天</dt>
          <dd className="text-body">{task.why}</dd>
        </div>
        <div className="flex gap-sm">
          <dt className="w-20 shrink-0 text-muted">成功判定</dt>
          <dd className="text-body">{task.successCriteria}</dd>
        </div>
      </dl>

      <Link href={href} className="mt-lg block">
        <Button fullWidth variant={task.priority === "必须" ? "primary" : "secondary"}>
          开始训练
        </Button>
      </Link>
    </article>
  );
}
