"use client";

/**
 * 申论作答 → 批改 → 重写（CL-05 全闭环，屏 §11.12）。
 * 作答：实时字数与限制提醒（F0203）+ 范例对照（F0215）。
 * 批改：参考分 + 维度 + 采点对齐/漏点 + 优先改三点 + 置信度（F0204–F0213）。
 * 重写：同题二次作答 + 前后对比（F0216/F0217），能力画像自动更新（F0218）。
 */
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { essayQuestionById } from "@/lib/essay/bank";
import { countWords, exampleOutlineFor, gradeEssay } from "@/lib/essay/grade";
import { compareRewrite } from "@/lib/essay/rewrite";
import type { EssayGrade } from "@/lib/essay/types";

export default function EssayWorkPage() {
  const params = useParams<{ id: string }>();
  const q = essayQuestionById(params.id);
  const { essaySubmissions, essayGrades, addEssaySubmission } = useProfileStore();
  const [text, setText] = useState("");
  const [showExample, setShowExample] = useState(false);
  const [round, setRound] = useState(0);

  const history = useMemo(
    () =>
      q
        ? essaySubmissions
            .filter((s) => s.questionId === q.id)
            .sort((a, b) => a.round - b.round)
        : [],
    [essaySubmissions, q],
  );
  const latest = history[history.length - 1];
  const latestGrade = latest ? essayGrades[latest.id] : undefined;
  const previous = history.length >= 2 ? history[history.length - 2] : undefined;
  const previousGrade = previous ? essayGrades[previous.id] : undefined;
  const comparison =
    latestGrade && previousGrade
      ? compareRewrite(previousGrade, latestGrade)
      : null;

  if (!q) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pt-xl">
        <EmptyState why="题目不存在。" action="请返回申论教练重新选择。" />
      </main>
    );
  }

  const words = countWords(text);
  const overLimit = words > q.wordLimit * 1.1;
  const nearLimit = words > q.wordLimit * 0.9 && !overLimit;

  const submit = (): void => {
    const id = `es-${Date.now()}`;
    const grade = gradeEssay({ id, text }, q);
    addEssaySubmission(
      { id, questionId: q.id, text, submittedAt: new Date().toISOString(), round },
      q,
      grade,
    );
    setText("");
    setRound((r) => r + 1);
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header>
        <div className="flex items-center gap-sm">
          <Chip tone="neutral">{q.type}</Chip>
          <span className="text-caption text-muted">
            {q.year} {q.region} {q.exam}
          </span>
        </div>
        <h1 className="mt-sm text-headline-lg text-ink">{q.title}</h1>
        <p className="mt-sm text-body-md text-body">{q.task}</p>
      </header>

      {/* 材料（§11.12 移动端：材料先行） */}
      <Card tone="warm" className="mt-lg">
        <p className="text-label-md text-muted">{q.materials[0]!.title}</p>
        {q.materials[0]!.paragraphs.map((p, i) => (
          <p key={i} className="mt-sm text-body-md text-body" style={{ lineHeight: 1.8 }}>
            {p}
          </p>
        ))}
      </Card>

      {/* 作答（F0201/F0203） */}
      <label className="mt-xl block">
        <span className="text-label-md text-muted">
          作答区{round > 0 ? `（第 ${round + 1} 次作答 · 重写）` : ""}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          aria-label="申论作答"
          placeholder="在此输入你的答案…"
          className="mt-xs w-full rounded-md border border-border-strong bg-canvas-warm p-lg text-body-md text-ink leading-relaxed focus:border-primary focus:outline-none"
        />
      </label>
      <div className="mt-xs flex items-center justify-between text-caption">
        <span
          className={
            overLimit ? "text-error" : nearLimit ? "text-warning" : "text-muted"
          }
          role="status"
          aria-label="字数"
        >
          {words} / {q.wordLimit} 字
          {overLimit ? " · 已超限" : nearLimit ? " · 接近上限" : ""}
        </span>
        <button
          type="button"
          onClick={() => setShowExample((v) => !v)}
          aria-expanded={showExample}
          className="text-primary underline-offset-2 hover:underline"
        >
          范例对照
        </button>
      </div>
      {showExample ? (
        <ul className="mt-sm list-disc space-y-xs pl-lg rounded-md bg-surface-soft p-md text-caption text-body">
          {exampleOutlineFor(q).map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      ) : null}

      <Button className="mt-lg" fullWidth disabled={words < 20} onClick={submit}>
        提交批改
      </Button>

      {/* 批改结果（F0204–F0213） */}
      {latestGrade ? <GradeView grade={latestGrade} /> : null}

      {/* 重写对比（F0216/F0217） */}
      {comparison ? (
        <Card className="mt-lg">
          <p className="text-label-md text-muted">前后对比</p>
          <p className="mt-xs text-body-md text-body">{comparison.summary}</p>
          {comparison.dimensionDeltas.filter((d) => d.delta !== 0).length > 0 ? (
            <p className="mt-xs text-caption text-muted">
              维度变化：
              {comparison.dimensionDeltas
                .filter((d) => d.delta !== 0)
                .map((d) => `${d.id} ${d.delta > 0 ? "+" : ""}${d.delta}%`)
                .join(" · ")}
            </p>
          ) : null}
        </Card>
      ) : null}

      {latestGrade ? (
        <p className="mt-lg text-caption text-muted">
          提交批改后会自动更新你的申论维度画像（F0218）；
          <Link href="/essay/report" className="text-primary underline-offset-2 hover:underline">
            查看完整报告
          </Link>
          ，或
          <Link href="/essay" className="text-primary underline-offset-2 hover:underline">
            返回题型列表
          </Link>
          。
        </p>
      ) : null}
    </main>
  );
}

function GradeView({ grade }: { grade: EssayGrade }) {
  return (
    <Card className="mt-xl" tone="faint" radius="lg">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="text-micro text-primary">批改结果 · 参考性质</p>
          <p className="mt-xs text-stat-lg text-ink">{grade.score}</p>
          <p className="text-caption text-muted">满分 {grade.dimensions.reduce((s, d) => s + d.full, 0)}</p>
        </div>
        <Chip tone={grade.confidence === "高" ? "insight" : grade.confidence === "中" ? "neutral" : "warning"}>
          置信 {grade.confidence}
        </Chip>
      </div>
      <p className="mt-sm text-caption text-muted">{grade.confidenceNote}</p>

      {/* 维度（F0205） */}
      <div className="mt-lg space-y-sm">
        {grade.dimensions.map((d) => (
          <div key={d.id}>
            <div className="flex justify-between text-caption text-muted">
              <span>{d.id}</span>
              <span>
                {d.score} / {d.full}
              </span>
            </div>
            <div className="mt-xxs h-1.5 w-full rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (d.score / Math.max(d.full, 1)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 优先改三点（F0213） */}
      <div className="mt-lg">
        <p className="text-label-md text-warning">优先修改（最多三点）</p>
        <ol className="mt-sm space-y-sm">
          {grade.topFixes.map((f) => (
            <li key={f.title} className="rounded-md border border-warning-soft bg-warning-soft/50 p-md">
              <p className="text-body-sm font-medium text-ink">{f.title}</p>
              <p className="mt-xs text-caption text-body">{f.action}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* 采点对齐 + 漏点（F0206/F0207/F0211） */}
      <details className="mt-lg">
        <summary className="cursor-pointer text-body-sm text-primary">查看全部得分点对照（证据引用）</summary>
        <div className="mt-sm space-y-md">
          {grade.hits.map((h) => (
            <div key={h.pointId} className="rounded-md border border-success-soft bg-success-soft/40 p-md">
              <p className="text-label-md text-ink">
                ✓ {h.label}（{h.points} 分）
              </p>
              <p className="mt-xs text-caption text-body">你的原句：「{h.userSentence.slice(0, 60)}…」</p>
            </div>
          ))}
          {grade.misses.map((m) => (
            <div key={m.pointId} className="rounded-md border border-error-soft bg-error-soft/40 p-md">
              <p className="text-label-md text-ink">✗ 未覆盖：{m.label}（{m.points} 分）</p>
              <p className="mt-xs text-caption text-body">材料依据：「{m.materialQuote.slice(0, 60)}…」</p>
            </div>
          ))}
        </div>
      </details>

      {/* 结构/规范/冗余 */}
      {grade.structureIssues.length > 0 || grade.normSuggestions.length > 0 || grade.redundancies.length > 0 ? (
        <details className="mt-md">
          <summary className="cursor-pointer text-body-sm text-primary">结构与表达细节</summary>
          <ul className="mt-sm space-y-xs text-caption text-body">
            {grade.structureIssues.map((s) => (
              <li key={s}>· {s}</li>
            ))}
            {grade.normSuggestions.map((n) => (
              <li key={n.bad}>
                · 表达替换：「{n.bad}」→「{n.good}」
              </li>
            ))}
            {grade.redundancies.slice(0, 3).map((r, i) => (
              <li key={i}>· 冗余：{r.sentence.slice(0, 40)}…（{r.reason}）</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
