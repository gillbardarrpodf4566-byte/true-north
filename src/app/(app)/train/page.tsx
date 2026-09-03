"use client";

/**
 * Practice Hub — §11.5：今日推荐（处方任务大卡）+ 继续上次 + 专项能力（高密度列表）+
 * 错题修复入口。推荐与自由选择并存（autonomy × competence）。
 */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { InsetGroup, ListRow, RowChevron } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { MODULES } from "@/lib/profile/types";
import { seedQuestions } from "@/lib/questions/seed";
import { useState } from "react";

export default function TrainPage() {
  const { prescription, taskResults, sessions, wrongBook } = useProfileStore();
  const [mixMode, setMixMode] = useState<"专项" | "混合" | "复习" | "速度">("混合");
  const [showMethods, setShowMethods] = useState(false);

  const pending = (prescription?.tasks ?? []).filter(
    (t) => !taskResults.some((r) => r.taskId === t.id),
  );
  const unfinished = sessions.filter((s) => s.finishedAt == null);

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">训练</h1>

      {/* V1 训练模式（F0126/F0129）：推荐与自由选择并存 */}
      <Card className="mt-lg" radius="lg">
        <p className="text-label-md text-muted">快速组一组题</p>
        <div className="mt-sm flex flex-wrap gap-sm" role="group" aria-label="训练模式">
          {(["专项", "混合", "复习", "速度"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mixMode === m}
              onClick={() => setMixMode(m)}
              className={`rounded-full px-md py-sm text-label-md transition-colors duration-feedback ease-standard ${
                mixMode === m
                  ? "bg-primary-faint text-primary-active"
                  : "bg-surface-soft text-muted"
              }`}
            >
              {m === "混合" ? "混合练习" : m === "复习" ? "错题复测" : m === "速度" ? "速度训练" : "专项练习"}
            </button>
          ))}
        </div>
        <p className="mt-sm text-caption text-muted">
          {mixMode === "混合" ? "跨题型轮换，避免只会一种表述。" : mixMode === "复习" ? "按错因与遗忘风险安排近邻题。" : mixMode === "速度" ? "固定题量与限时，反馈执行成本。" : "按一个模块与题型集中练习。"}
        </p>
        <Link href={`/train/session/auto-${mixMode}`} className="mt-md block">
          <Button fullWidth variant="secondary">开始 {mixMode} · 8 题</Button>
        </Link>
      </Card>

      {/* F0305 方法卡 */}
      <div className="mt-md">
        <button type="button" onClick={() => setShowMethods((v) => !v)} aria-expanded={showMethods} className="text-label-md text-primary">方法卡（关键解题策略）{showMethods ? "收起" : "展开"}</button>
        {showMethods ? (
          <InsetGroup
            className="mt-sm"
            footer="方法卡只给路径提示，不代替你完成题目。"
          >
            <ListRow
              fullSeparator
              title="资料分析：先读问题，再回材料定位；先估算量级，再精算。"
            />
            <ListRow
              fullSeparator
              title="判断推理：先写出充分/必要条件方向，避免把逆命题当原命题。"
            />
            <ListRow
              fullSeparator
              title="言语理解：先找转折/总结句，再判断选项是否扩大或缩小范围。"
            />
          </InsetGroup>
        ) : null}
      </div>

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
            {pending.map((t, index) => (
              <Card key={t.id} tone={index === 0 ? "faint" : "surface"} radius="lg">
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
          <InsetGroup className="mt-md">
            {unfinished.map((s) => (
              <ListRow
                key={s.id}
                title={`${s.moduleId} · 已答 ${Object.keys(s.answers).length} 题（已自动保存）`}
                trailing={
                  <Link href={`/train/session/${s.id}`}>
                    <Button variant="secondary">继续训练</Button>
                  </Link>
                }
              />
            ))}
          </InsetGroup>
        </section>
      ) : null}

      {/* 专项能力（F0125 自主选择，高密度列表） */}
      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">专项训练</h2>
        <InsetGroup className="mt-md">
          {MODULES.map((m) => (
            <ListRow key={m} interactive className="p-0">
              <Link
                href={`/train/session/free-${m}`}
                className="flex min-h-row-min w-full items-center justify-between gap-md px-base py-md"
              >
                <span className="text-body-md text-ink">{m}</span>
                <span className="flex shrink-0 items-center gap-sm text-caption text-muted">
                  {seedQuestions(m).length} 题题组
                  <RowChevron />
                </span>
              </Link>
            </ListRow>
          ))}
        </InsetGroup>
      </section>

      {/* 申论（V1 CL-05） */}
      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">申论</h2>
        <InsetGroup className="mt-md">
          <ListRow interactive className="p-0">
            <Link
              href="/essay"
              className="flex min-h-row-min w-full items-center justify-between gap-md px-base py-md"
            >
              <span className="text-body-md text-ink">申论教练（概括 / 对策 / 公文 / 大作文）</span>
              <RowChevron />
            </Link>
          </ListRow>
        </InsetGroup>
      </section>

      {/* 错题修复（CL-03 step3-5） */}
      <section className="mt-xl">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-lg text-ink">错题修复</h2>
          {wrongBook.length > 0 ? <Chip tone="warning">{wrongBook.length} 题待处理</Chip> : null}
        </div>
        <InsetGroup className="mt-md">
          <ListRow interactive className="p-0">
            <Link
              href="/train/wrongbook"
              className="flex min-h-row-min w-full items-center justify-between gap-md px-base py-md"
            >
              <span className="text-body-md text-ink">错题本与错因确认</span>
              <RowChevron />
            </Link>
          </ListRow>
        </InsetGroup>
      </section>
    </main>
  );
}
