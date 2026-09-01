"use client";

/**
 * Mock Exam — §11.11 + F0180–F0191。
 * Before：考试长度/计时/结构/开始确认。During：极低噪声（仅进度/时间/题/答案，
 * 无 AI 无建议）。After：先整体后诊断；历史对比 F0190；自动交卷 F0186。
 * 规模：种子题库裁剪的整卷（5 模块 × 2 题，12 分钟）——MVP 验证闭环用。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressTrack } from "@/components/ui/Progress";
import { useProfileStore } from "@/lib/profile/store";
import { buildTrainingSet } from "@/lib/questions/seed";
import type { Question } from "@/lib/questions/types";
import { MODULES } from "@/lib/profile/types";
import { computeBaseline } from "@/lib/baseline/compute";
import { nextExamExperiment, suggestModuleOrder } from "@/lib/insights/v1";
import { suggestErrorCause } from "@/lib/errorcause/engine";

const EXAM_SECONDS = 12 * 60;
const PER_MODULE = 2;

function buildPaper(): Question[] {
  return MODULES.flatMap((m) => buildTrainingSet(m, PER_MODULE, 3));
}

export default function MockPage() {
  const router = useRouter();
  const { imports, addImport, setBaseline, profile } = useProfileStore();
  const [phase, setPhase] = useState<"before" | "during" | "after">("before");
  /** F0181 阶段模考：短模考/整卷由当前阶段选择 */
  const [examMode, setExamMode] = useState<"短模考" | "整卷">("整卷");
  // 短模考真实缩短为前三模块各2题；整卷使用五模块×2题。
  const paper = useMemo(() => {
    const full = buildPaper();
    return examMode === "短模考" ? full.filter((q) => ["言语理解", "判断推理", "资料分析"].includes(q.moduleId)) : full;
  }, [examMode]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [showFlags, setShowFlags] = useState(false);
  const [remain, setRemain] = useState(EXAM_SECONDS);
  const moduleStart = useRef<number>(Date.now());
  const moduleSeconds = useRef<Record<string, number>>({});
  /** F0184：模块进入顺序与切换轨迹 */
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});

  const q = paper[index];
  const finishedRef = useRef(false);

  // 全局计时 + 自动交卷（F0182/F0186）
  useEffect(() => {
    if (phase !== "during") return;
    const t = setInterval(() => {
      setRemain((s) => {
        if (s <= 1) {
          clearInterval(t);
          finishRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const finish = useCallback((): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // 模块耗时快照（F0183）
    const moduleId = q?.moduleId;
    if (moduleId) {
      moduleSeconds.current[moduleId] =
        (moduleSeconds.current[moduleId] ?? 0) + Math.round((Date.now() - moduleStart.current) / 1000);
    }
    setSpent({ ...moduleSeconds.current });

    // 判分（F0187）
    const answered = paper.filter((qq) => answers[qq.id] != null);
    const correctList = answered.filter((qq) => answers[qq.id] === qq.answerIndex);
    const totalScore = round1(correctList.reduce((s, qq) => s + fullOf(qq.moduleId) / PER_MODULE, 0));
    const imp = {
      id: `mock-${Date.now()}`,
      source: "系统训练" as const,
      platform: "见岸模考",
      examLabel: "整卷模考",
      importedAt: new Date().toISOString(),
      totalScore,
      sourceRef: { kind: "external" as const, rawEvidence: JSON.stringify({ examMode, moduleOrder, spent }), parserVersion: "mock-exam-v1" },
      modules: MODULES.filter((m) => paper.some((qq) => qq.moduleId === m)).map((m) => {
        const qs = paper.filter((qq) => qq.moduleId === m);
        const cor = qs.filter((qq) => answers[qq.id] === qq.answerIndex).length;
        return {
          id: m,
          score: round1((cor / qs.length) * fullOf(m)),
          questions: qs.length,
          correct: cor,
          secondsPerQuestion: Math.round(
            (moduleSeconds.current[m] ?? 0) / Math.max(qs.length, 1),
          ),
        };
      }),
    };
    void answered;
    void correctList;
    addImport(imp);
    setBaseline(computeBaseline([...imports, imp]));
    setPhase("after");
  }, [answers, paper, q, imports, addImport, setBaseline, examMode, moduleOrder, spent]);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  const gotoQuestion = (i: number): void => {
    const prevModule = q?.moduleId;
    const nextModule = paper[i]?.moduleId;
    if (prevModule) {
      moduleSeconds.current[prevModule] =
        (moduleSeconds.current[prevModule] ?? 0) + Math.round((Date.now() - moduleStart.current) / 1000);
    }
    if (nextModule !== prevModule) {
      moduleStart.current = Date.now();
      if (nextModule) setModuleOrder((order) => order.includes(nextModule) ? order : [...order, nextModule]);
    }
    setIndex(i);
    setShowFlags(false);
  };

  // ---------- Before ----------
  if (phase === "before") {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">整卷模考</h1>
        <div className="mt-lg flex gap-sm" role="group" aria-label="模考模式">
          {(["短模考", "整卷"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={examMode === m} onClick={() => setExamMode(m)} className={`rounded-full border px-md py-sm text-label-md ${examMode === m ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"}`}>{m}</button>
          ))}
        </div>
        <Card className="mt-md">
          <dl className="space-y-xs text-body-sm text-body">
            <div className="flex gap-sm">
              <dt className="w-24 shrink-0 text-muted">结构</dt>
              <dd>
                {MODULES.map((m) => `${m}×${PER_MODULE}`).join(" · ")}
              </dd>
            </div>
            <div className="flex gap-sm">
              <dt className="w-24 shrink-0 text-muted">总时长</dt>
              <dd>{examMode === "短模考" ? "6 分钟（重点模块短测）" : "12 分钟（到时自动交卷）"}</dd>
            </div>
            <div className="flex gap-sm">
              <dt className="w-24 shrink-0 text-muted">考中规则</dt>
              <dd>无 AI、无提示、不可回看已交模块；可标记题目最后回看。</dd>
            </div>
          </dl>
        </Card>
        <p className="mt-md text-caption text-muted">
          成绩会计入个人基线并触发重新诊断（F0081）。当前为裁剪版整卷，用于建立节奏。
        </p>
        <Button
          className="mt-lg"
          fullWidth
          onClick={() => {
            moduleStart.current = Date.now();
            setModuleOrder([paper[0]?.moduleId ?? ""]);
            setRemain(examMode === "短模考" ? 6 * 60 : EXAM_SECONDS);
            setPhase("during");
          }}
        >
          确认，开始模考
        </Button>
      </main>
    );
  }

  // ---------- After：报告 ----------
  if (phase === "after") {
    const answered = paper.filter((qq) => answers[qq.id] != null);
    const correctList = answered.filter((qq) => answers[qq.id] === qq.answerIndex);
    const totalScore = round1(correctList.reduce((s, qq) => s + fullOf(qq.moduleId) / PER_MODULE, 0));
    const history = imports
      .filter((im) => im.platform === "见岸模考")
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const prev = history[1];
    const delta = prev?.totalScore != null ? round1(totalScore - prev.totalScore) : null;

    // F0195/F0196：基于本场效率生成下场模块顺序和时间预算；F0197 给一条可验证实验。
    const pace = MODULES.filter((m) => paper.some((q) => q.moduleId === m)).map((m) => {
      const qs = paper.filter((qq) => qq.moduleId === m);
      const cor = qs.filter((qq) => answers[qq.id] === qq.answerIndex).length;
      return { moduleId: m, secondsPerQuestion: Math.round((spent[m] ?? 0) / Math.max(qs.length, 1)), accuracy: cor / Math.max(qs.length, 1) };
    });
    const nextOrder = suggestModuleOrder(pace);
    const experiment = nextExamExperiment(nextOrder, moduleOrder);

    // F0189 错因结构：按模块实际用时推每题秒数，逐题给出确定性错因归类
    const causeBuckets = new Map<string, number>();
    for (const question of answered) {
      const chosen = answers[question.id]!;
      if (chosen === question.answerIndex) continue;
      const moduleQuestions = paper.filter((item) => item.moduleId === question.moduleId).length;
      const perQuestionSeconds = Math.max(1, Math.round((spent[question.moduleId] ?? 0) / Math.max(moduleQuestions, 1)));
      const suggestion = suggestErrorCause(question, chosen, perQuestionSeconds);
      const cause = suggestion.cause ?? "待确认";
      causeBuckets.set(cause, (causeBuckets.get(cause) ?? 0) + 1);
    }
    const causeRows = [...causeBuckets.entries()].sort((a, b) => b[1] - a[1]);

    // F0191 关键变化：只突出最重要的改善与退化（模块正确率对比上一场）
    const keyChange = ((): string | null => {
      if (!prev) return null;
      const deltas: Array<{ m: string; d: number }> = [];
      for (const m of MODULES) {
        const qs = paper.filter((qq) => qq.moduleId === m);
        const cor = qs.filter((qq) => answers[qq.id] === qq.answerIndex).length;
        const cur = qs.length > 0 ? cor / qs.length : null;
        const pm = prev.modules.find((x) => x.id === m);
        const accuracyPrev =
          pm?.correct != null && pm?.questions ? pm.correct / pm.questions : null;
        if (cur == null || accuracyPrev == null) continue;
        deltas.push({ m, d: Math.round((cur - accuracyPrev) * 100) });
      }
      if (deltas.length === 0) return null;
      const best = [...deltas].sort((a, b) => b.d - a.d)[0]!;
      const worst = [...deltas].sort((a, b) => a.d - b.d)[0]!;
      const parts: string[] = [];
      if (best.d > 0) parts.push(`改善最明显的是${best.m}（+${best.d} 个百分点）`);
      if (worst.d < 0 && worst.m !== best.m) parts.push(`退化最明显的是${worst.m}（${worst.d} 个百分点）`);
      return parts.length > 0 ? parts.join("；") + "。" : "各模块与上一场基本持平。";
    })();

    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <p className="text-micro text-primary">模考报告</p>
        <h1 className="mt-sm text-headline-xl text-ink">
          {delta == null
            ? `本次 ${totalScore} 分（折算百分制 ${Math.round((totalScore / 135) * 100)}）。`
            : delta >= 0
              ? `本次 ${totalScore} 分，比上次高 ${delta} 分。`
              : `本次 ${totalScore} 分，比上次低 ${-delta} 分。`}
        </h1>
        <p className="mt-sm text-caption text-muted">
          {answered.length}/{paper.length} 题作答 · 成绩已计入基线，诊断将随之更新。
        </p>

        <Card className="mt-xl">
          <p className="text-label-md text-muted">模块表现</p>
          <ul className="mt-sm space-y-xs text-body-sm text-body">
            {MODULES.map((m) => {
              const qs = paper.filter((qq) => qq.moduleId === m);
              const cor = qs.filter((qq) => answers[qq.id] === qq.answerIndex).length;
              const secs = spent[m] ?? 0;
              return (
                <li key={m} className="flex justify-between">
                  <span>
                    {m} · {cor}/{qs.length}
                  </span>
                  <span className="text-muted">{formatDur(secs)}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="mt-lg">
          <p className="text-label-md text-muted">作答策略（F0184/F0189/F0195–F0197）</p>
          <p className="mt-xs text-body-sm text-body">本场模块进入顺序：{moduleOrder.filter(Boolean).join(" → ") || "未记录"}</p>
          <ul className="mt-sm space-y-xs text-caption text-body">
            {nextOrder.map((s) => <li key={s.moduleId}>建议第 {s.suggestedOrder} 做 {s.moduleId} · 预算约 {s.suggestedMinutes} 分钟：{s.rationale}</li>)}
          </ul>
          {experiment ? <p className="mt-sm text-caption text-primary">下场策略实验：{experiment.hypothesis} 验证指标：{experiment.metric}。{experiment.nullResult}</p> : <p className="mt-sm text-caption text-muted">本场顺序与效率建议一致，下场可保持原策略。</p>}
        </Card>

        {/* F0189 错因结构：区分知识、策略、审题与时间压力，而不是只报对错 */}
        {causeRows.length > 0 ? (
          <Card className="mt-lg">
            <p className="text-label-md text-muted">错因结构（F0189）</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {causeRows.map(([cause, count]) => (
                <li key={cause}>{cause} · {count} 题</li>
              ))}
            </ul>
            <p className="mt-xs text-caption text-muted">按每题实际用时与干扰项归类；「待确认」需要你在错题本二次判断。</p>
          </Card>
        ) : null}

        {keyChange ? (
          <Card className="mt-lg">
            <p className="text-label-md text-muted">关键变化（F0191）</p>
            <p className="mt-xs text-body-sm text-body">{keyChange}</p>
          </Card>
        ) : null}

        {delta != null ? (
          <p className="mt-md text-caption text-muted">
            与最近 {Math.min(history.length, 5)} 次模考对比已计入；单次波动不改变主计划。
          </p>
        ) : null}

        <div className="sticky bottom-0 mt-xl bg-canvas pt-md">
          <Button fullWidth onClick={() => router.push("/diagnosis")}>
            查看更新后的诊断
          </Button>
        </div>
      </main>
    );
  }

  // ---------- During：极低噪声 ----------
  if (!q) return null;
  const flags = paper.filter((qq) => flagged.includes(qq.id));

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-margin-mobile pb-xl pt-md">
      <div className="flex items-center gap-md">
        <span className="text-label-md text-muted tabular-nums">
          {index + 1} / {paper.length}
        </span>
        <div className="flex-1">
          <ProgressTrack value={index / paper.length} label="考试进度" />
        </div>
        <span
          className={`text-label-md tabular-nums ${remain < 60 ? "text-error" : "text-muted"}`}
          role="timer"
          aria-label="剩余时间"
        >
          {formatDur(remain)}
        </span>
      </div>

      <Card tone="warm" padding="standard" className="mt-lg">
        <Chip tone="neutral">{q.moduleId}</Chip>
        {q.material ? (
          <div className="mt-md overflow-x-auto rounded-sm border border-border bg-surface p-md">
            <p className="text-label-md text-ink">{q.material.title}</p>
            <table className="mt-sm w-full text-caption text-body">
              <thead>
                <tr className="text-left text-muted">
                  {q.material.columns.map((c) => (
                    <th key={c} className="py-xxs pr-md font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.material.rows.map((r) => (
                  <tr key={r.label} className="border-t border-border">
                    <td className="py-xxs pr-md">{r.label}</td>
                    {r.values.map((v, vi) => (
                      <td key={vi} className="py-xxs pr-md tabular-nums">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-md whitespace-pre-line text-body-lg text-ink">{q.stem}</p>
      </Card>

      <div className="mt-lg space-y-md" role="radiogroup" aria-label="答案选项">
        {q.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={answers[q.id] === i}
            /* MVP 测试钩子（与训练页一致），转生产前经 env 关闭 */
            data-correct={i === q.answerIndex ? "1" : undefined}
            onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
            className={`flex w-full items-start gap-md rounded-md border p-md text-left text-body-md text-ink ${
              answers[q.id] === i ? "border-primary bg-primary-faint" : "border-border bg-surface"
            }`}
          >
            <span className="mt-xxs flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-label-md">
              {"ABCD"[i]}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      <div className="mt-lg flex items-center gap-md">
        <Button variant="tertiary" onClick={() => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]))}>
          {flagged.includes(q.id) ? "取消标记" : "标记回看"}
        </Button>
        <Button variant="tertiary" onClick={() => setShowFlags((v) => !v)} aria-expanded={showFlags}>
          回看列表{flags.length > 0 ? `（${flags.length}）` : ""}
        </Button>
        <span className="flex-1" />
        <Button variant="tertiary" onClick={finish}>
          交卷
        </Button>
      </div>

      {showFlags ? (
        <div className="mt-md rounded-md border border-border bg-surface p-md">
          {flags.length === 0 ? (
            <p className="text-caption text-muted">还没有标记的题目。</p>
          ) : (
            <ul className="space-y-xs">
              {flags.map((qq) => (
                <li key={qq.id}>
                  <button
                    type="button"
                    className="text-body-sm text-primary"
                    onClick={() => gotoQuestion(paper.findIndex((x) => x.id === qq.id))}
                  >
                    {qq.moduleId} · {qq.stem.slice(0, 18)}…
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-lg flex gap-sm">
        <Button variant="secondary" disabled={index === 0} onClick={() => gotoQuestion(index - 1)}>
          上一题
        </Button>
        <Button
          className="flex-1"
          onClick={() => (index + 1 >= paper.length ? finish() : gotoQuestion(index + 1))}
        >
          {index + 1 >= paper.length ? "交卷" : "下一题"}
        </Button>
      </div>
      {profile.goal ? (
        <p className="mt-md text-center text-caption text-muted-soft">
          {profile.goal.examName} · 模拟整卷
        </p>
      ) : null}
    </main>
  );
}

function fullOf(id: string): number {
  const map: Record<string, number> = {
    言语理解: 40,
    判断推理: 40,
    数量关系: 15,
    资料分析: 20,
    常识判断: 20,
  };
  return map[id] ?? 20;
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
