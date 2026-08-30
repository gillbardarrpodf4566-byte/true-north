"use client";

/**
 * Practice Hub — §11.5：今日推荐（处方任务大卡）+ 继续上次 + 专项能力（高密度列表）+
 * 错题修复入口。推荐与自由选择并存（autonomy × competence）。
 */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { MODULES } from "@/lib/profile/types";
import { seedQuestions } from "@/lib/questions/seed";

export default function TrainPage() {
  const { prescription, taskResults, sessions, wrongBook } = useProfileStore();

  const pending = (prescription?.tasks ?? []).filter(
    (t) => !taskResults.some((r) => r.taskId === t.id),
  );
  const unfinished = sessions.filter((s) => s.finishedAt == null);

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">训练</h1>

      {/* 今日推荐（F0124） */}
      <section className="mt-lg">
        <h2 className="text-title-lg text-ink">今日推荐</h2>
        {pending.length === 0 ? (
          <div className="mt-md">
            <EmptyState
              why="今天的处方已经完成，或还没有处方。"
              action="回今日看新的处方，或从下面的专项里自由选择。"
              cta="回今日"
              onAction={() => (window.location.href = "/today")}
            />
          </div>
        ) : (
          <div className="mt-md space-y-md">
            {pending.map((t) => (
              <Card key={t.id} tone="faint" radius="lg">
                <div className="flex items-start justify-between gap-md">
                  <div>
                    <p className="text-title-md text-ink">{t.title}</p>
                    <p className="mt-xs text-body-sm text-body">{t.successCriteria}</p>
                  </div>
                  <Chip tone={t.priority === "必须" ? "opportunity" : "insight"}>
                    {t.priority}
                  </Chip>
                </div>
                <Link href={`/train/session/${t.id}`} className="mt-md block">
                  <Button fullWidth>
                    开始 · {t.minutes} 分钟 / {t.questionCount} 题
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 继续上次（中断可续做） */}
      {unfinished.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">继续上次</h2>
          <div className="mt-md space-y-md">
            {unfinished.map((s) => (
              <Card key={s.id} as="div">
                <p className="text-body-md text-ink">
                  {s.moduleId} · 已答 {Object.keys(s.answers).length} 题（已自动保存）
                </p>
                <Link href={`/train/session/${s.id}`} className="mt-sm inline-block">
                  <Button variant="secondary">继续训练</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* 专项能力（F0125 自主选择，高密度列表） */}
      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">专项训练</h2>
        <ul className="mt-md divide-y divide-border rounded-lg border border-border bg-surface">
          {MODULES.map((m) => (
            <li key={m}>
              <Link
                href={`/train/session/free-${m}`}
                className="flex items-center justify-between px-lg py-md"
              >
                <span className="text-body-md text-ink">{m}</span>
                <span className="text-caption text-muted">{seedQuestions(m).length} 题题组 ›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 错题修复（CL-03 step3-5） */}
      <section className="mt-xl">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-lg text-ink">错题修复</h2>
          {wrongBook.length > 0 ? <Chip tone="warning">{wrongBook.length} 题待处理</Chip> : null}
        </div>
        <Link
          href="/train/wrongbook"
          className="mt-md flex items-center justify-between rounded-lg border border-border bg-surface px-lg py-md"
        >
          <span className="text-body-md text-ink">错题本与错因确认</span>
          <span className="text-caption text-muted">›</span>
        </Link>
      </section>
    </main>
  );
}
