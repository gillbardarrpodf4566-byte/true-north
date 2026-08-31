"use client";

/**
 * 申论 Hub — F0198 题型选择 / F0199 真题练习 / F0200 专项弱项推荐 /
 * F0224–F0226 报告入口。屏 §11.12（移动端材料与作答分阶段）。
 */
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { ESSAY_SEED } from "@/lib/essay/bank";
import { weakestDimension } from "@/lib/essay/grade";
import type { EssayType } from "@/lib/essay/types";

const TYPES: EssayType[] = ["概括", "对策", "公文", "大作文"];

export default function EssayHubPage() {
  const essaySubmissions = useProfileStore((s) => s.essaySubmissions);
  const essayGrades = useProfileStore((s) => s.essayGrades);
  const essayAbilities = useProfileStore((s) => s.essayAbilities);

  const gradesList = useMemo(() => Object.values(essayGrades), [essayGrades]);

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">申论教练</h1>
      <p className="mt-xs text-body-sm text-muted">
        按题型或真题练习；批改给出参考分、采点对齐与最值得优先修改的三点。
      </p>

      {/* F0200 专项弱项推荐 */}
      {essayAbilities.map((a) => {
        const history: NonNullable<(typeof essayGrades)[string]>[] = [];
        for (const s of essaySubmissions) {
          const qMeta = ESSAY_SEED.find((x) => x.id === s.questionId);
          const g = essayGrades[s.id];
          if (qMeta?.type === a.type && g) history.push(g);
        }
        const w = weakestDimension(history);
        return (
          <Card key={a.type} className="mt-lg" tone="faint" radius="lg">
            <p className="text-label-md text-muted">专项弱项推荐 · {a.type}</p>
            <p className="mt-xs text-body-sm text-body">
              {w
                ? `「${w.id}」维度偏弱（${Math.round(w.ratio * 100)}%），建议优先练习同类题。`
                : "暂无明确弱项。"}
            </p>
          </Card>
        );
      })}

      {/* F0198/F0199：题型 × 真题列表 */}
      {TYPES.map((t) => (
        <section key={t} className="mt-xl">
          <h2 className="text-title-lg text-ink">{t}</h2>
          <ul className="mt-md space-y-md">
            {ESSAY_SEED.filter((q) => q.type === t).map((q) => {
              const attempts = essaySubmissions.filter((s) => s.questionId === q.id).length;
              return (
                <li key={q.id}>
                  <Link
                    href={`/essay/${q.id}`}
                    className="block rounded-lg border border-border bg-surface p-lg"
                  >
                    <div className="flex items-start justify-between gap-md">
                      <span className="text-body-md text-ink">{q.title}</span>
                      {attempts > 0 ? <Chip tone="insight">{attempts} 次</Chip> : null}
                    </div>
                    <p className="mt-xs text-caption text-muted">
                      {q.year} {q.region} {q.exam} · {q.wordLimit} 字
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {gradesList.length === 0 ? (
        <div className="mt-xl">
          <EmptyState
            why="还没有申论作答记录。"
            action="完成第一次作答后，这里会出现维度画像与专项弱项推荐。"
          />
        </div>
      ) : (
        <Card className="mt-xl text-center">
          <Link href="/essay/report" className="text-label-md text-primary">
            查看申论报告（趋势 / 高频问题 / 专项处方）›
          </Link>
        </Card>
      )}
    </main>
  );
}
