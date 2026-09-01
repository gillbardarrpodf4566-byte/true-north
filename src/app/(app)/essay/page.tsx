"use client";

/**
 * 申论 Hub — F0198 题型选择 / F0199 真题练习 / F0200 专项弱项推荐 /
 * F0224–F0226 报告入口。屏 §11.12（移动端材料与作答分阶段）。
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { weakestDimension } from "@/lib/essay/grade";
import { usePublishedEssays } from "@/lib/essay/usePublished";
import { useFeatureFlag } from "@/lib/ai/useFlags";
import type { EssayType } from "@/lib/essay/types";

const TYPES: EssayType[] = ["概括", "对策", "公文", "大作文"];

export default function EssayHubPage() {
  const essaySubmissions = useProfileStore((s) => s.essaySubmissions);
  const essayGrades = useProfileStore((s) => s.essayGrades);
  const essayAbilities = useProfileStore((s) => s.essayAbilities);
  const { enabled: essayEnabled, loading: flagsLoading } = useFeatureFlag("essay_coach");
  const { essays } = usePublishedEssays();

  const gradesList = useMemo(() => Object.values(essayGrades), [essayGrades]);
  // F0199 真题按年份/地区筛选
  const [yearFilter, setYearFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const years = useMemo(() => [...new Set(essays.map((item) => String(item.question.year)))].sort((a, b) => b.localeCompare(a)), [essays]);
  const regions = useMemo(() => [...new Set(essays.map((item) => item.question.region))].sort(), [essays]);
  if (!flagsLoading && !essayEnabled) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">申论教练</h1>
        <div className="mt-xl"><EmptyState why="申论教练正在灰度开放。" action="当前账号暂未进入试用分组；不会影响已有作答记录。" /></div>
      </main>
    );
  }

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
          const qMeta = essays.find((x) => x.question.id === s.questionId)?.question;
          const g = essayGrades[s.id];
          if (qMeta?.type === a.type && g) history.push(g);
        }
        const w = weakestDimension(history);
        // F0200：推荐必须落到具体题目——同题型中练得最少的一题
        const sameType = essays.filter((item) => item.question.type === a.type);
        const target = [...sameType].sort((left, right) =>
          essaySubmissions.filter((s) => s.questionId === left.question.id).length -
          essaySubmissions.filter((s) => s.questionId === right.question.id).length,
        )[0];
        return (
          <Card key={a.type} className="mt-lg" tone="faint" radius="lg">
            <p className="text-label-md text-muted">专项弱项推荐 · {a.type}</p>
            <p className="mt-xs text-body-sm text-body">
              {w
                ? `「${w.id}」维度偏弱（${Math.round(w.ratio * 100)}%），建议优先练习同类题。`
                : "暂无明确弱项。"}
            </p>
            {target ? (
              <Link href={`/essay/${target.question.id}`} className="mt-sm inline-block text-label-md text-primary">
                去练「{target.question.title}」→
              </Link>
            ) : null}
          </Card>
        );
      })}

      {/* F0199 真题筛选：按年份与地区 */}
      <div className="mt-lg grid grid-cols-2 gap-md">
        <label className="block">
          <span className="text-caption text-muted">年份</span>
          <select aria-label="真题年份" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink">
            <option value="">全部年份</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-caption text-muted">地区</span>
          <select aria-label="真题地区" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink">
            <option value="">全部地区</option>
            {regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
      </div>

      {/* F0198/F0199：题型 × 真题列表 */}
      {TYPES.map((t) => (
        <section key={t} className="mt-xl">
          <h2 className="text-title-lg text-ink">{t}</h2>
          <ul className="mt-md space-y-md">
            {essays.filter((item) =>
              item.question.type === t &&
              (yearFilter === "" || String(item.question.year) === yearFilter) &&
              (regionFilter === "" || item.question.region === regionFilter),
            ).map(({ question: q, revision }) => {
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
                      {q.year} {q.region} {q.exam} · {q.wordLimit} 字{revision > 0 ? ` · 内容版本 r${revision}` : ""}
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
