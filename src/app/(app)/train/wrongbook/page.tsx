"use client";

/**
 * 错题本与错因确认（F0149/F0151–F0157 + §11.7 信息顺序的错因部分）。
 * 低置信错因必须用户确认；确认后进入「验证中」，近邻题复测累计 2 次对才「已修复」。
 */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { confirmCause, remediationFor } from "@/lib/errorcause/engine";
import { questionById } from "@/lib/questions/seed";
import type { ErrorCause } from "@/lib/questions/types";

const CAUSES: ErrorCause[] = ["知识缺口", "策略选择错误", "审题错误", "计算错误", "定位错误"];

const statusTone = {
  待判断: "neutral",
  待确认: "warning",
  验证中: "insight",
  已修复: "insight",
  复发: "warning",
} as const;

export default function WrongbookPage() {
  const { wrongBook, updateWrongEntry, favorites, watchlist, toggleWatchlist } = useProfileStore();

  if (wrongBook.length === 0) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">错题本</h1>
        <div className="mt-xl">
          <EmptyState
            why="错题本还是空的。"
            action="训练中答错的题会自动进入这里，并给出错因建议供你确认。"
            cta="去训练"
            onAction={() => (window.location.href = "/train")}
          />
        </div>
      </main>
    );
  }

  const active = wrongBook.filter((w) => w.status !== "已修复");

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">错题本</h1>
      <p className="mt-xs text-body-sm text-muted">
        错因是修复的起点。确认错因后做近邻题复测，连续两次答对才算修复。
      </p>

      <div className="mt-lg space-y-lg">
        {active.map((entry) => {
          const q = questionById(entry.questionId);
          const suggested = entry.suggested;
          return (
            <Card key={entry.questionId} as="article">
              <div className="flex items-start justify-between gap-md">
                <p className="text-body-md text-ink">{q ? q.stem.split("\n")[0] : entry.questionId}</p>
                <Chip tone={statusTone[entry.status]}>{entry.status}</Chip>
              </div>

              {suggested ? (
                <div className="mt-md rounded-sm bg-surface-soft p-md">
                  <p className="text-label-md text-muted">
                    AI 建议{suggested.confidence === "低" ? "（低置信，请确认）" : ""}
                  </p>
                  <p className="mt-xs text-body-sm text-body">
                    {suggested.cause ? `${suggested.cause} —— ${suggested.evidence}` : suggested.evidence}
                  </p>
                </div>
              ) : null}

              {entry.status === "待判断" && suggested && !suggested.needsUserConfirm ? (
                <div className="mt-md flex gap-sm">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateWrongEntry(
                        entry.questionId,
                        confirmCause(entry, suggested.cause ?? "知识缺口"),
                      )
                    }
                  >
                    认可这个错因
                  </Button>
                  <CausePicker
                    onPick={(c) => updateWrongEntry(entry.questionId, confirmCause(entry, c))}
                  />
                </div>
              ) : null}

              {entry.status === "待确认" ? (
                <div className="mt-md">
                  <CausePicker
                    onPick={(c) => updateWrongEntry(entry.questionId, confirmCause(entry, c))}
                  />
                </div>
              ) : null}

              {entry.confirmedCause ? (
                <div className="mt-md">
                  <p className="text-label-md text-muted">修复建议</p>
                  <p className="mt-xs text-body-sm text-body">
                    {q ? remediationFor(entry, q) : "先重做原题。"}
                  </p>
                  {entry.status === "验证中" ? (
                    <Link href={`/train/session/retest-${entry.questionId}`} className="mt-sm inline-block">
                      <Button variant="secondary">开始近邻题复测</Button>
                    </Link>
                  ) : null}
                  {entry.status === "复发" ? (
                    <p className="mt-sm text-caption text-warning">
                      复发了，已重新排入训练处方，不要灰心——复发是修复过程的一部分。
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {wrongBook.some((w) => w.status === "已修复") ? (
        <p className="mt-xl text-caption text-muted">
          已修复 {wrongBook.filter((w) => w.status === "已修复").length} 题，它们仍会在间隔复测中出现。
        </p>
      ) : null}

      {/* F0134 收藏的题 */}
      {favorites.length > 0 ? (
        <section className="mt-section">
          <h2 className="text-title-lg text-ink">收藏的代表题（{favorites.length}）</h2>
          <ul className="mt-md space-y-md">
            {favorites.map((id) => {
              const q = questionById(id);
              return (
                <li key={id} className="rounded-md border border-border bg-surface p-md">
                  <p className="text-body-sm text-body">{q ? q.stem.split("\n")[0] : id}</p>
                  <p className="mt-xs text-caption text-muted">
                    {q ? `${q.moduleId} · ${q.knowledgePoint}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* F0150 关注库：答对但高耗时，需要提速而非纠错 */}
      {watchlist.length > 0 ? (
        <section className="mt-section">
          <h2 className="text-title-lg text-ink">关注库（{watchlist.length}）</h2>
          <p className="mt-xs text-caption text-muted">这些题答对了但明显偏慢（单题 ≥90 秒），问题是熟练度而不是对错。</p>
          <ul className="mt-md space-y-md">
            {watchlist.map((id) => {
              const q = questionById(id);
              return (
                <li key={id} className="rounded-md border border-border bg-surface p-md">
                  <div className="flex items-start justify-between gap-md">
                    <p className="text-body-sm text-body">{q ? q.stem.split("\n")[0] : id}</p>
                    <button type="button" onClick={() => toggleWatchlist(id)} className="shrink-0 text-caption text-muted underline-offset-2 hover:underline">
                      移出关注
                    </button>
                  </div>
                  <p className="mt-xs text-caption text-muted">{q ? `${q.moduleId} · ${q.knowledgePoint}` : ""}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function CausePicker({ onPick }: { onPick: (c: ErrorCause) => void }) {
  return (
    <div role="group" aria-label="选择错因" className="flex flex-wrap gap-sm">
      {CAUSES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="rounded-full border border-border bg-surface px-md py-sm text-label-md text-muted"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
