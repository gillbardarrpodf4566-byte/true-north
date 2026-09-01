"use client";

/**
 * Weekly Review — §11.10 + CL-07 + xlsx 周复盘状态机。
 *
 * 叙事顺序：本周一句话 → 有效变化 → 无效投入 → 新发现 → 下周重点（用户确认）。
 * 状态机：待生成（禁止强行生成趋势结论→输出数据缺口）→ 待确认（确认/纠正/
 * 补充反思；禁止系统静默改变下周目标）→ 已重排。
 * §8.16：进入时一段 ≤700ms 的海岸线 Signature 动效（reduced-motion 直接显示）。
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore, type WeeklyReview as WR } from "@/lib/profile/store";
import { duration, easing } from "@/design/tokens";

function weekKeyOf(d = new Date()): string {
  const monday = new Date(d);
  const day = (d.getDay() + 6) % 7;
  monday.setDate(d.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

export default function WeeklyReviewPage() {
  const { imports, taskResults, wrongBook, weeklyReview, setWeeklyReview, profile } =
    useProfileStore();
  const weekKey = weekKeyOf();

  const draft = useMemo((): WR | null => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const weekTasks = taskResults.filter((r) => new Date(r.completedAt).getTime() >= weekAgo);
    const weekExams = imports.filter(
      (im) => im.source !== "系统训练" && new Date(im.importedAt).getTime() >= weekAgo,
    );
    // 禁止强行生成趋势结论：无任何数据 → 输出数据缺口
    if (weekTasks.length === 0 && weekExams.length === 0) return null;

    const minutes = weekTasks.reduce((s, r) => s + r.minutes, 0);
    const met = weekTasks.filter((r) => r.metCriteria).length;
    const questions = weekTasks.reduce((s, r) => s + (r.questions ?? 0), 0);
    const correct = weekTasks.reduce((s, r) => s + (r.correct ?? 0), 0);
    const accuracy = questions > 0 ? correct / questions : null;

    const effective: string[] = [];
    const wasted: string[] = [];
    if (met > 0) effective.push(`${met} 项任务达到成功判定（共 ${weekTasks.length} 项、${minutes} 分钟）。`);
    if (weekExams.length > 0) effective.push(`完成 ${weekExams.length} 次模考，诊断已随之更新。`);
    if (weekTasks.length > 0 && met === 0)
      wasted.push("本周任务都没有达到成功判定——可能任务偏难，或时间被切断。");
    const wrongActive = wrongBook.filter((w) => w.status === "复发").length;
    if (wrongActive > 0) wasted.push(`${wrongActive} 个错因复发，修复节奏需要放慢。`);
    if (minutes >= 150 && met / Math.max(weekTasks.length, 1) < 0.5)
      wasted.push("投入不低但达标率低：重点可能不是「更多」，而是「更准」。");

    const discoveries: string[] = [];
    if (accuracy != null)
      discoveries.push(`本周训练正确率 ${Math.round(accuracy * 100)}%（${questions} 题）。`);
    if (profile.conditions)
      discoveries.push(
        `按计划预算（工作日 ${profile.conditions.weekdayMinutes} 分钟）实际执行 ${Math.round(
          minutes / 7,
        )} 分钟/天。`,
      );

    const priorities: string[] = [];
    if (wasted.length > 0) priorities.push("先修复复发错因，再开新题。");
    if (weekExams.length === 0) priorities.push("安排 1 次模考，刷新个人基线。");
    if (met > 0 && accuracy != null && accuracy >= 0.75)
      priorities.push("保持当前节奏，把「必须」任务稳定在每天 1 项。");
    if (priorities.length === 0) priorities.push("维持现有计划，下周同一时间复盘。");

    return {
      weekKey,
      status: "待确认",
      conclusion:
        met > 0
          ? `这周最值得说的不是刷了多少题，而是有 ${met} 项训练真正达标了。`
          : "这周投入了时间，但还没转化到达标的输出上。",
      effective: effective.length > 0 ? effective : ["本周暂无明确的有效变化。"],
      wasted: wasted.length > 0 ? wasted : ["没有发现明显的无效投入。"],
      discoveries,
      nextPriorities: priorities.slice(0, 3),
      reflection: "",
      confirmedAt: null,
    };
  }, [imports, taskResults, wrongBook, profile.conditions, weekKey]);

  const [reflection, setReflection] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (draft && priorities.length === 0) setPriorities(draft.nextPriorities);
  }, [draft, priorities.length]);

  const existing = weeklyReview && weeklyReview.weekKey === weekKey ? weeklyReview : draft;

  if (!existing) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">本周复盘</h1>
        <div className="mt-xl">
          <EmptyState
            why="这一周还没有训练或模考记录，系统不会强行生成趋势结论。"
            action="完成任意一次训练或导入一次模考后，周复盘会在这里出现。"
            cta="去训练"
            onAction={() => (window.location.href = "/train")}
          />
        </div>
      </main>
    );
  }

  const confirm = (): void => {
    setWeeklyReview({
      ...existing,
      status: "已重排",
      nextPriorities: priorities.filter((p) => p.trim() !== ""),
      reflection: reflection.trim() || undefined,
      confirmedAt: new Date().toISOString(),
    });
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(8px)",
          transition: `opacity ${duration.hero}ms ${easing.standard}, transform ${duration.hero}ms ${easing.standard}`,
        }}
      >
        <p className="text-micro text-primary">周复盘 · {weekKey} 起</p>
        <h1 className="mt-sm text-headline-xl text-ink">{existing.conclusion}</h1>
      </header>

      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">有效变化</h2>
        <ul className="mt-md space-y-sm">
          {existing.effective.map((e) => (
            <li key={e} className="rounded-md bg-surface p-md text-body-sm text-body">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">无效投入</h2>
        <ul className="mt-md space-y-sm">
          {existing.wasted.map((e) => (
            <li key={e} className="rounded-md bg-surface p-md text-body-sm text-body">
              {e}
            </li>
          ))}
        </ul>
      </section>

      {existing.discoveries.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">新发现</h2>
          <ul className="mt-md space-y-sm">
            {existing.discoveries.map((e) => (
              <li key={e} className="rounded-md bg-surface-soft p-md text-body-sm text-body">
                {e}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {existing.status === "待确认" ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">下周重点（确认后生效）</h2>
          <p className="mt-xs text-caption text-muted">
            系统不会静默修改你的下周目标；确认或修改后才会计入计划。
          </p>
          <div className="mt-md space-y-md">
            {existing.nextPriorities.map((p, i) => (
              <label key={p} className="flex items-start gap-md rounded-md border border-border bg-surface p-md text-body-sm text-body">
                <input
                  type="checkbox"
                  checked={priorities.includes(p)}
                  onChange={(e) =>
                    setPriorities((cur) =>
                      e.target.checked ? [...cur, p] : cur.filter((x) => x !== p),
                    )
                  }
                  className="mt-[3px] h-4 w-4 accent-[var(--ja-color-primary)]"
                />
                <span>
                  {i + 1}. {p}
                </span>
              </label>
            ))}
          </div>

          <label className="mt-lg block">
            <span className="text-label-md text-muted">补充这周的情况（可选）</span>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="例如：周三是休假 / 有两天状态很差…"
              className="mt-xs w-full rounded-sm border border-border-strong bg-surface p-md text-body-md text-ink placeholder:text-muted-soft"
            />
          </label>

          <Button className="mt-lg" fullWidth disabled={priorities.length === 0} onClick={confirm}>
            确认 {priorities.length} 个下周重点
          </Button>
        </section>
      ) : (
        <section className="mt-xl">
          <Card tone="faint" radius="lg">
            <div className="flex items-center gap-sm">
              <Chip tone="insight">已重排</Chip>
              <span className="text-caption text-muted">
                {existing.confirmedAt ? `确认于 ${existing.confirmedAt.slice(5, 10)}` : ""}
              </span>
            </div>
            <ul className="mt-md space-y-xs text-body-sm text-body">
              {existing.nextPriorities.map((p, i) => (
                <li key={p}>
                  {i + 1}. {p}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </main>
  );
}
