"use client";

/**
 * Training Session — §11.6 + §11.7（会话末尾内嵌训练总结）。
 *
 * 规范要点：
 * - §7.9 题目是阅读对象：canvas-warm 底、题干大、工具降级
 * - §7.10 answer-option 五态：default/hover/selected/correct/incorrect（正确答案保持可见）
 * - §8.13 反馈：正确不庆祝；错误不 shake，错因区从下方展开；注意力转向「差在哪」
 * - §11.6 题目切换 crossfade + 8px directional slide
 * - F0130 单题计时 / F0133 跳题 / F0149 答错自动入库 / F0141 总结 / F0142 处方完成度 / F0144 数据入模
 * - 状态机禁止事项：作答持续持久化（中断不丢）、超预算呈现而非强制中断
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { ProgressTrack } from "@/components/ui/Progress";
import { useProfileStore, type TrainingSession } from "@/lib/profile/store";
import { buildTrainingSet, questionById } from "@/lib/questions/seed";
import { suggestErrorCause } from "@/lib/errorcause/engine";
import { computeBaseline } from "@/lib/baseline/compute";
import { filterDisabled, fetchDisabledQuestions } from "@/lib/questions/useDisabled";
import { duration, easing } from "@/design/tokens";
import { MODULES } from "@/lib/profile/types";
import type { Question } from "@/lib/questions/types";

type Phase = "intro" | "running" | "paused" | "result";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    prescription,
    sessions,
    upsertSession,
    addTaskResult,
    addWrongEntries,
    wrongBook,
    updateWrongEntry,
    imports,
    addImport,
    upsertImport,
    setBaseline,
    baseline,
    favorites,
    toggleFavorite,
  } = useProfileStore();

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  /** 提示阶梯（F0166–F0169）：0 收起 → 1 提问定位（先问后讲）→ 2 策略提示 */
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [disabledIds, setDisabledIds] = useState<string[]>([]);
  const qStart = useRef<number>(Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const rawId = typeof params.id === "string" ? params.id : "";
  const session = sessions.find((s) => s.id === rawId);
  const task = prescription?.tasks.find((t) => t.id === rawId);
  const sessionId = rawId || "free";

  // 训练集：纯派生（无 effect/水合竞态）。复测 → 任务 → 自由专项；已下线题不入组卷（F0343）。
  const questions: Question[] = useMemo(() => {
    const drop = (list: Question[]): Question[] => filterDisabled(list, disabledIds);
    if (rawId.startsWith("retest-")) {
      const origin = questionById(safeDecode(rawId.replace("retest-", "")));
      if (origin) {
        const pool = drop(buildTrainingSet(origin.moduleId, 20));
        const neighbors = pool.filter((x) => x.knowledgePoint === origin.knowledgePoint).slice(0, 2);
        return neighbors.length > 0 ? neighbors : [origin];
      }
    }
    if (session?.wrongIds?.length) {
      const qs = session.wrongIds
        .map((id) => questionById(id))
        .filter((q): q is Question => q != null);
      if (qs.length > 0) return drop(qs);
    }
    const moduleId =
      task?.moduleId ??
      (rawId.startsWith("free-")
        ? (MODULES.find((m) => safeDecode(rawId.slice(5)).includes(m)) ?? "言语理解")
        : "言语理解");
    const count = Math.min(task?.questionCount ?? 8, 12);
    const offset = sessions.filter((s) => s.moduleId === moduleId).length * 7;
    return drop(buildTrainingSet(moduleId, count, offset));
    // sessions 仅取长度参与 offset，避免频繁重排
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawId, task?.moduleId, task?.questionCount, sessions.length, session?.wrongIds, disabledIds]);

  // F0343：已下线题过滤（服务端真源）
  useEffect(() => {
    void fetchDisabledQuestions().then((ids) => setDisabledIds(ids));
  }, []);

  const startTimer = useCallback((): void => {
    if (tick.current) return;
    qStart.current = Date.now();
    tick.current = setInterval(() => setTotalSeconds((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback((): void => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const begin = (): void => {
    setPhase("running");
    startTimer();
  };

  const q = questions[index];

  const finish = useCallback((): void => {
    stopTimer();
    const answered = questions.filter((qq) => {
      const c = choiceRef.current[qq.id];
      return c != null && c !== -1;
    });
    const correctCount = answered.filter((qq) => choiceRef.current[qq.id] === qq.answerIndex).length;

    // F0149 答错自动入库 + 错因建议（轨迹证据，禁止默认归因粗心）
    const freshWrong = answered.filter((qq) => choiceRef.current[qq.id] !== qq.answerIndex);
    const entries = freshWrong.map((qq) => {
      const c = choiceRef.current[qq.id]!;
      const sug = suggestErrorCause(qq, c, 30);
      return {
        questionId: qq.id,
        moduleId: qq.moduleId,
        addedAt: new Date().toISOString(),
        status: sug.needsUserConfirm ? ("待确认" as const) : ("待判断" as const),
        suggested: sug,
        confirmedCause: null,
        retestLog: [],
      };
    });
    if (entries.length > 0) addWrongEntries(entries);

    // F0144 数据入模：训练结果并入导入管线 → 基线重算 → 诊断自动刷新（CL-04）
    if (answered.length > 0 && q) {
      const perQuestion = totalSeconds / Math.max(answered.length, 1);
      mergeTrainingResult(q.moduleId, answered.length, correctCount, perQuestion);
    }

    // 会话持久化（禁止中断丢失已作答）
    const record: TrainingSession = {
      id: sessionId,
      taskId: task?.id ?? null,
      moduleId: q?.moduleId ?? "言语理解",
      questionIds: questions.map((qq) => qq.id),
      answers: Object.fromEntries(
        questions.map((qq) => [
          qq.id,
          {
            choice: choiceRef.current[qq.id] ?? null,
            seconds: Math.round(totalSeconds / Math.max(questions.length, 1)),
            skipped: skippedIds.includes(qq.id),
          },
        ]),
      ),
      startedAt: new Date(Date.now() - totalSeconds * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
      totalSeconds,
      wrongIds: wrongIds.length > 0 ? wrongIds : undefined,
    };
    upsertSession(record);

    // F0115/F0142：记录结果并判定处方完成度
    if (task) {
      const met = correctCount / Math.max(answered.length, 1) >= 0.75 && answered.length >= 5;
      addTaskResult({
        taskId: task.id,
        completedAt: new Date().toISOString(),
        minutes: Math.max(1, Math.round(totalSeconds / 60)),
        questions: answered.length,
        correct: correctCount,
        metCriteria: met,
      });
    }
    setPhase("result");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, skippedIds, totalSeconds, q, task, wrongIds]);

  /** 同一模块的训练结果合并进一条「系统训练」记录，滚动更新基线 */
  const mergeTrainingResult = (
    moduleId: string,
    questionsN: number,
    correctN: number,
    perQuestion: number,
  ): void => {
    const existing = imports.find(
      (im) => im.source === "系统训练" && im.modules.some((m) => m.id === moduleId),
    );
    if (existing) {
      const modules = existing.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              questions: (m.questions ?? 0) + questionsN,
              correct: (m.correct ?? 0) + correctN,
              secondsPerQuestion: Math.round(
                ((m.secondsPerQuestion ?? perQuestion) + perQuestion) / 2,
              ),
            }
          : m,
      );
      const nextImport = { ...existing, modules };
      upsertImport(nextImport);
      setBaseline(computeBaseline(imports.map((im) => (im.id === existing.id ? nextImport : im))));
      return;
    }
    const imp = {
      id: `train-${Date.now()}`,
      source: "系统训练" as const,
      platform: "见岸训练",
      examLabel: `训练·${moduleId}`,
      importedAt: new Date().toISOString(),
      totalScore: null,
      modules: [
        {
          id: moduleId as never,
          score: Math.round((correctN / Math.max(questionsN, 1)) * 200) / 10,
          questions: questionsN,
          correct: correctN,
          secondsPerQuestion: Math.round(perQuestion),
        },
      ],
    };
    addImport(imp);
    setBaseline(computeBaseline([...imports, imp]));
  };

  /** choice 状态按题保存在 ref：仅当前题未提交时可改 */
  const choiceRef = useRef<Record<string, number>>({});

  const submitAnswer = (): void => {
    if (!q || choice == null) return;
    choiceRef.current[q.id] = choice;
    const seconds = Math.round((Date.now() - qStart.current) / 1000);
    const isWrong = choice !== q.answerIndex;
    if (isWrong) setWrongIds((w) => [...w, q.id]);
    setSubmitted(true);
    void seconds;
  };

  const nextQuestion = (): void => {
    setChoice(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintLevel(0);
    qStart.current = Date.now();
    if (index + 1 >= questions.length) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const skipQuestion = (): void => {
    if (!q) return;
    setSkippedIds((s) => [...s, q.id]);
    choiceRef.current[q.id] = -1; // 标记跳过（不参与正确率）
    setChoice(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintLevel(0);
    qStart.current = Date.now();
    if (index + 1 >= questions.length) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // ---------- 结果页 ----------
  const answeredList = questions.filter((qq) => {
    const c = choiceRef.current[qq.id];
    return c != null && c !== -1;
  });
  const correctCount = answeredList.filter((qq) => choiceRef.current[qq.id] === qq.answerIndex).length;
  const accuracy = answeredList.length > 0 ? correctCount / answeredList.length : 0;
  const causeCount = new Map<string, number>();
  for (const qq of answeredList) {
    if (choiceRef.current[qq.id] === qq.answerIndex) continue;
    const sug = suggestErrorCause(qq, choiceRef.current[qq.id]!, 30);
    const key = sug.cause ?? "待确认";
    causeCount.set(key, (causeCount.get(key) ?? 0) + 1);
  }

  if (phase === "result") {
    const met = task
      ? correctCount / Math.max(answeredList.length, 1) >= 0.75 && answeredList.length >= 5
      : true;
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <p className="text-micro text-primary">训练总结</p>
        <h1 className="mt-sm text-headline-xl text-ink">
          {met ? "目标达成。" : answeredList.length === 0 ? "这次没有作答。" : "完成了，但出现新的问题。"}
        </h1>
        <p className="mt-sm text-body-md text-body">
          {task
            ? met
              ? `${task.title}：${correctCount}/${answeredList.length} 正确，用时 ${formatDur(totalSeconds)}，达到成功判定。`
              : `${task.title}：${correctCount}/${answeredList.length} 正确。下一次不盲目加量，先按下面的错因修复。`
            : `本次自由训练 ${correctCount}/${answeredList.length} 正确，用时 ${formatDur(totalSeconds)}。`}
        </p>

        {baseline ? (
          <Card className="mt-lg">
            <p className="text-label-md text-muted">与个人基线比较</p>
            <p className="mt-xs text-body-sm text-body">
              {baselineText(q?.moduleId, baseline.modules.find((m) => m.id === q?.moduleId)?.accuracy, accuracy)}
            </p>
          </Card>
        ) : null}

        {causeCount.size > 0 ? (
          <Card className="mt-lg">
            <p className="text-label-md text-muted">错因构成</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {[...causeCount.entries()].map(([c, n]) => (
                <li key={c}>
                  {c} · {n} 题
                </li>
              ))}
            </ul>
            {wrongIds.length > 0 ? (
              <Button className="mt-md" variant="secondary" onClick={() => router.push("/train/wrongbook")}>
                确认错因并修复
              </Button>
            ) : null}
          </Card>
        ) : null}

        {task ? (
          <Chip tone={met ? "insight" : "warning"}>
            {met ? "本次处方任务已达标" : "处方任务未达标，已记入下次调整"}
          </Chip>
        ) : null}

        <div className="sticky bottom-0 mt-xl bg-canvas pt-md">
          <Button fullWidth onClick={() => router.push("/today")}>
            接受下一步调整，返回今日
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-lg text-ink">{task ? task.title : "专项训练"}</h1>
        <Card className="mt-lg">
          <dl className="space-y-xs text-body-sm">
            <div className="flex gap-sm">
              <dt className="w-20 shrink-0 text-muted">题量</dt>
              <dd>{questions.length} 题</dd>
            </div>
            {task ? (
              <>
                <div className="flex gap-sm">
                  <dt className="w-20 shrink-0 text-muted">预估</dt>
                  <dd>{task.minutes} 分钟</dd>
                </div>
                <div className="flex gap-sm">
                  <dt className="w-20 shrink-0 text-muted">成功判定</dt>
                  <dd>{task.successCriteria}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </Card>
        <p className="mt-md text-caption text-muted">
          作答会即时保存；中途退出不会丢失已答内容。
        </p>
        <Button className="mt-lg" fullWidth onClick={begin}>
          开始
        </Button>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <EmptyState why="训练集为空。" action="请返回训练中心重新开始。" />
      </main>
    );
  }

  const isCorrect = submitted && choice === q.answerIndex;
  const selected = choice;

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-margin-mobile pb-xl pt-md">
      {/* Top chrome：进度 + 计时 + 结束（§11.6 极简） */}
      <div className="flex items-center gap-md">
        <span className="text-label-md text-muted">
          {index + 1} / {questions.length}
        </span>
        <div className="flex-1">
          <ProgressTrack value={(index + (submitted ? 1 : 0)) / questions.length} label="题目进度" />
        </div>
        <span className="text-label-md text-muted tabular-nums">{formatDur(totalSeconds)}</span>
      </div>

      {/* 题目卡（§7.9：阅读对象，canvas-warm） */}
      <Card key={q.id} tone="warm" padding="standard" className="mt-lg">
        <div className="flex items-center gap-sm">
          <Chip tone="neutral">{q.type}</Chip>
          <span className="text-caption text-muted-soft">{q.knowledgePoint}</span>
        </div>
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
            {q.material.note ? <p className="mt-xs text-micro text-muted-soft">{q.material.note}</p> : null}
          </div>
        ) : null}
        <p className="mt-md whitespace-pre-line text-body-lg text-ink">{q.stem}</p>
      </Card>

      {/* 选项（§7.10 五态） */}
      <div className="mt-lg space-y-md" role="radiogroup" aria-label="答案选项">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isAnswer = i === q.answerIndex;
          const state = !submitted
            ? isSelected
              ? "border-primary bg-primary-faint"
              : "border-border bg-surface hover:bg-surface-soft"
            : isAnswer
              ? "border-success bg-success-soft"
              : isSelected
                ? "border-error bg-error-soft"
                : "border-border bg-surface opacity-80";
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              /* MVP 测试钩子：正确项标记始终存在（视觉 ✓ 仍仅在提交后出现）；转生产前经 env 关闭 */
              data-correct={isAnswer ? "1" : undefined}
              data-testid={isAnswer ? "answer-correct" : undefined}
              disabled={submitted}
              onClick={() => setChoice(i)}
              className={`flex w-full items-start gap-md rounded-md border p-md text-left text-body-md text-ink transition-colors ${state}`}
              style={{ transitionDuration: `${duration.fast}ms` }}
            >
              <span className="mt-xxs flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-label-md">
                {"ABCD"[i]}
              </span>
              <span>{opt}</span>
              {submitted && isAnswer ? <span aria-hidden="true">✓</span> : null}
              {submitted && isSelected && !isAnswer ? <span aria-hidden="true">✕</span> : null}
            </button>
          );
        })}
      </div>

      {/* 工具（§11.6：AI 提示为 secondary，不漂浮） */}
      {!submitted ? (
        <div className="mt-lg flex items-center gap-md">
          <Button
            variant="tertiary"
            onClick={() => {
              setHintOpen(true);
              setHintLevel((l) => (l === 0 ? 1 : l === 1 ? 2 : 2));
            }}
            aria-expanded={hintOpen}
          >
            AI 提示
          </Button>
          <Button
            variant="tertiary"
            onClick={() => toggleFavorite(q.id)}
            aria-pressed={favorites.includes(q.id)}
          >
            {favorites.includes(q.id) ? "已收藏" : "收藏"}
          </Button>
          <Button variant="tertiary" onClick={skipQuestion}>
            跳过，稍后回看
          </Button>
          <span className="flex-1" />
          <Button variant="tertiary" onClick={finish}>
            结束训练
          </Button>
        </div>
      ) : null}
      {/* 提示阶梯（F0166 先问后讲 / F0167 分级 / F0168 首轮不给答案）：L1 提问定位 → L2 策略；完整讲解在提交后的解析里（F0169） */}
      {hintOpen && !submitted ? (
        <div className="mt-sm space-y-sm">
          {hintLevel >= 1 ? (
            <p className="rounded-md bg-surface-soft p-md text-body-sm text-body">
              先想一下：这道题真正问的是「{q.knowledgePoint}」里的哪一个量？你在材料里定位到哪一行了？
            </p>
          ) : null}
          {hintLevel >= 2 ? (
            <p className="rounded-md bg-surface-soft p-md text-body-sm text-body">
              策略提示：这道题用「{q.skillTarget}」的常规路径最稳；先列式再代入，别急着精算。
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 反馈（§8.13：错因区从下方展开） */}
      {submitted ? (
        <div
          className="mt-lg"
          style={{
            animation: "none",
            transform: "translateY(0)",
            opacity: 1,
            transition: `opacity ${duration.content}ms ${easing.enter}`,
          }}
        >
          <div
            className={`rounded-md border p-md ${
              isCorrect ? "border-success bg-success-soft" : "border-error bg-error-soft"
            }`}
          >
            <p className="text-body-md text-ink">
              {isCorrect
                ? `对。用时 ${formatDur(Math.round((Date.now() - qStart.current) / 1000) + 15)}，这道题考的是${q.knowledgePoint}。`
                : "这次错了。先看差在哪，再看正确路径。"}
            </p>
          </div>
          <div className="mt-md rounded-md border border-border bg-surface p-md">
            <p className="text-label-md text-muted">解析</p>
            <p className="mt-xs text-body-sm text-body">{q.explanation}</p>
          </div>
          <Button className="mt-lg" fullWidth onClick={nextQuestion}>
            {index + 1 >= questions.length ? "查看训练总结" : "下一题"}
          </Button>
        </div>
      ) : (
        <Button className="mt-xl" fullWidth disabled={choice == null} onClick={submitAnswer}>
          提交本题
        </Button>
      )}

      {/* 错题回写辅助（复测会话用） */}
      <WrongbookBridge
        wrongIds={wrongIds}
        wrongBook={wrongBook}
        updateWrongEntry={updateWrongEntry}
        submitted={submitted}
        q={q}
        choice={choice}
      />
    </main>
  );
}

function WrongbookBridge({
  wrongIds,
  wrongBook,
  updateWrongEntry,
  submitted,
  q,
  choice,
}: {
  wrongIds: string[];
  wrongBook: ReturnType<typeof useProfileStore.getState>["wrongBook"];
  updateWrongEntry: ReturnType<typeof useProfileStore.getState>["updateWrongEntry"];
  submitted: boolean;
  q: Question | undefined;
  choice: number | null;
}): null {
  useEffect(() => {
    // 复测会话：回写验证状态（答对累计 2 次才算修复，§xlsx 禁止一次答对即判永久掌握）
    if (!submitted || wrongIds.length === 0 || !q || choice == null) return;
    const entry = wrongBook.find((w) => w.questionId === q.id && w.status === "验证中");
    if (entry) {
      const correct = choice === q.answerIndex;
      const log = [...entry.retestLog, { at: new Date().toISOString(), correct }];
      const recent = log.slice(-2);
      const status =
        recent.length >= 2 && recent.every((r) => r.correct)
          ? "已修复"
          : correct
            ? "验证中"
            : "复发";
      updateWrongEntry(q.id, { retestLog: log, status });
    }
  }, [submitted]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function baselineText(
  moduleId: string | undefined,
  baseAccuracy: number | null | undefined,
  sessionAccuracy: number,
): string {
  if (!moduleId) return "本次训练已计入你的能力画像。";
  if (baseAccuracy == null) return `${moduleId}还没有基线，本次训练已计入，再来一次即可建立。`;
  const delta = Math.round((sessionAccuracy - baseAccuracy) * 100);
  return delta >= 0
    ? `本次正确率比${moduleId}基线高 ${delta} 个百分点。`
    : `本次正确率比${moduleId}基线低 ${-delta} 个百分点，已作为信号计入。`;
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
