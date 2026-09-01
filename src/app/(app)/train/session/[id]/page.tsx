"use client";

/**
 * Training Session — §11.6 + §11.7（会话末尾内嵌训练总结）。
 *
 * 状态机禁止事项：题级作答持续持久化（中断不丢）、超预算呈现而非强制中断。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { ProgressTrack } from "@/components/ui/Progress";
import { useProfileStore, type TrainingSession, type TrainingSessionDraft } from "@/lib/profile/store";
import { buildTrainingSet, questionById } from "@/lib/questions/seed";
import { recordRetest, suggestErrorCause } from "@/lib/errorcause/engine";
import { computeBaseline } from "@/lib/baseline/compute";
import { filterDisabled, fetchDisabledQuestions } from "@/lib/questions/useDisabled";
import { autoAssemble, buildWrongRetestSet, strategyFeedback, nextStepSuggestion, questionVersionHistory, neighborQuestions } from "@/lib/training/advanced";
import { adaptiveDifficulty, lightenTask, replacementFor, scaffoldLevel } from "@/lib/plan/adaptive";
import { computeAbilityDimensions } from "@/lib/ability/dimensions";
import { duration, easing } from "@/design/tokens";
import { MODULES } from "@/lib/profile/types";
import type { Question } from "@/lib/questions/types";

type Phase = "intro" | "running" | "paused" | "result";
type SessionAnswers = TrainingSession["answers"];

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    prescription,
    diagnosis,
    sessions,
    upsertSession,
    addTaskResult,
    addAttemptRecords,
    attemptRecords,
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
    toggleWatchlist,
  } = useProfileStore();

  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>({});
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [disabledIds, setDisabledIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<TrainingSessionDraft | null>(null);

  const answersRef = useRef<SessionAnswers>({});
  const choiceRef = useRef<Record<string, number>>({});
  const startedAtRef = useRef<string | null>(null);
  const activeQuestionBaseSeconds = useRef(0);
  const qStart = useRef(Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const restoredSessionId = useRef<string | null>(null);

  const rawId = typeof params.id === "string" ? params.id : "";
  const baseTaskId = rawId.replace(/::(light|replacement)$/, "");
  const variant = rawId.endsWith("::light") ? "light" : rawId.endsWith("::replacement") ? "replacement" : null;
  const sessionId = rawId || "free";
  const session = sessions.find((item) => item.id === sessionId);
  const baseTask = prescription?.tasks.find((task) => task.id === baseTaskId);
  const task = baseTask
    ? variant === "light"
      ? lightenTask(baseTask)
      : variant === "replacement"
        ? replacementFor(baseTask, diagnosis) ?? baseTask
        : baseTask
    : undefined;
  const retestSourceId = rawId.startsWith("retest-") ? safeDecode(rawId.slice("retest-".length)) : null;

  // 已有未完成会话必须按保存顺序恢复，不能因 sessions.length 变化重新组题。
  const questions: Question[] = useMemo(() => {
    const drop = (list: Question[]): Question[] => filterDisabled(list, disabledIds);
    if (session?.questionIds.length) {
      const saved = session.questionIds
        .map((questionId) => questionById(questionId))
        .filter((question): question is Question => question != null);
      if (saved.length > 0) return drop(saved);
    }
    if (rawId.startsWith("retest-")) {
      const origin = questionById(safeDecode(rawId.replace("retest-", "")));
      if (origin) {
        const pool = drop(buildTrainingSet(origin.moduleId, 20));
        const neighbors = pool.filter((item) => item.knowledgePoint === origin.knowledgePoint).slice(0, 2);
        return neighbors.length > 0 ? neighbors : [origin];
      }
    }
    if (session?.wrongIds?.length) {
      const saved = session.wrongIds
        .map((questionId) => questionById(questionId))
        .filter((question): question is Question => question != null);
      if (saved.length > 0) return drop(saved);
    }
    if (rawId.startsWith("auto-")) {
      const modeRaw = safeDecode(rawId.slice(5));
      const mode = modeRaw === "专项" || modeRaw === "混合" || modeRaw === "复习" || modeRaw === "速度" ? modeRaw : "混合";
      if (mode === "复习") {
        const retest = drop(buildWrongRetestSet(wrongBook, 8));
        if (retest.length > 0) return retest;
      }
      return drop(autoAssemble(["资料分析", "判断推理", "言语理解"], 8, mode));
    }
    const moduleId = task?.moduleId ?? (rawId.startsWith("free-")
      ? (MODULES.find((module) => safeDecode(rawId.slice(5)).includes(module)) ?? "言语理解")
      : "言语理解");
    const count = Math.min(task?.questionCount ?? 8, 12);
    const offset = sessions.filter((item) => item.moduleId === moduleId && item.finishedAt != null).length * 7;
    // F0107：难度真正参与选题，而不是只写在任务标题里
    const difficulty = adaptiveDifficulty(moduleId, computeAbilityDimensions(attemptRecords));
    return drop(buildTrainingSet(moduleId, count, offset, difficulty));
  }, [rawId, task?.moduleId, task?.questionCount, sessions, session?.questionIds, session?.wrongIds, disabledIds, wrongBook, attemptRecords]);

  const questionIdsKey = questions.map((question) => question.id).join("\u001f");

  useEffect(() => {
    setHydrated(useProfileStore.persist.hasHydrated());
    return useProfileStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    void fetchDisabledQuestions().then((ids) => setDisabledIds(ids));
  }, []);

  useEffect(() => {
    if (!hydrated || !session || session.finishedAt != null || !session.draft || questions.length === 0) return;
    if (restoredSessionId.current === sessionId) return;

    const savedIndex = questions.findIndex((question) => question.id === session.draft!.currentQuestionId);
    const fallbackIndex = Math.max(0, questions.findIndex((question) => !(question.id in session.answers)));
    const nextIndex = savedIndex >= 0 ? savedIndex : fallbackIndex;
    const currentQuestion = questions[nextIndex] ?? questions[0]!;
    const draftMatchesQuestion = savedIndex >= 0;
    const restoredDraft: TrainingSessionDraft = draftMatchesQuestion
      ? session.draft
      : {
          ...session.draft,
          currentQuestionId: currentQuestion.id,
          currentQuestionSeconds: 0,
          selectedChoice: null,
          submitted: false,
          savedAt: new Date().toISOString(),
        };

    answersRef.current = { ...session.answers };
    choiceRef.current = Object.fromEntries(
      Object.entries(session.answers).flatMap(([questionId, answer]) =>
        answer.choice == null ? [] : [[questionId, answer.skipped ? -1 : answer.choice]],
      ),
    );
    startedAtRef.current = session.startedAt;
    activeQuestionBaseSeconds.current = restoredDraft.currentQuestionSeconds;
    setIndex(nextIndex);
    setChoice(restoredDraft.selectedChoice);
    setSubmitted(restoredDraft.submitted);
    setWrongIds(wrongQuestionIds(questions, session.answers));
    setAnswerChanges(restoredDraft.answerChanges);
    setTotalSeconds(totalWithActive(session.answers, restoredDraft));
    setDraft(restoredDraft);
    setPhase(restoredDraft.phase);
    restoredSessionId.current = sessionId;
  }, [hydrated, session, sessionId, questions]);

  useEffect(() => {
    if (!draft || phase === "intro" || phase === "result" || questionIdsKey.length === 0) return;
    const questionIds = questionIdsKey.split("\u001f");
    const savedQuestions = questionIds
      .map((questionId) => questionById(questionId))
      .filter((question): question is Question => question != null);
    const startedAt = startedAtRef.current ?? new Date().toISOString();
    startedAtRef.current = startedAt;
    upsertSession({
      id: sessionId,
      taskId: baseTask?.id ?? task?.id ?? null,
      moduleId: savedQuestions[0]?.moduleId ?? task?.moduleId ?? "言语理解",
      questionIds,
      answers: { ...answersRef.current },
      startedAt,
      finishedAt: null,
      totalSeconds: totalWithActive(answersRef.current, draft),
      draft: { ...draft, answerChanges: { ...draft.answerChanges } },
      wrongIds: wrongQuestionIds(savedQuestions, answersRef.current),
    });
  }, [draft, phase, questionIdsKey, sessionId, baseTask?.id, task?.id, task?.moduleId, upsertSession]);

  const stopTimer = (): void => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  };

  const activeQuestionSeconds = (): number =>
    Math.max(0, activeQuestionBaseSeconds.current + Math.floor((Date.now() - qStart.current) / 1000));

  const activeSecondsForState = (): number =>
    phase === "running" && !submitted ? activeQuestionSeconds() : (draft?.currentQuestionSeconds ?? 0);

  useEffect(() => {
    stopTimer();
    if (phase !== "running" || !draft || draft.submitted) return;
    activeQuestionBaseSeconds.current = draft.currentQuestionSeconds;
    qStart.current = Date.now();
    let ticks = 0;
    tick.current = setInterval(() => {
      const currentSeconds = activeQuestionSeconds();
      setTotalSeconds(finalizedSeconds(answersRef.current) + currentSeconds);
      ticks += 1;
      if (ticks % 5 === 0) {
        setDraft((current) => current && !current.submitted
          ? { ...current, currentQuestionSeconds: currentSeconds, savedAt: new Date().toISOString() }
          : current);
      }
    }, 1000);
    return stopTimer;
    // currentQuestionSeconds is deliberately excluded: five-second checkpoints must not restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, draft?.currentQuestionId, draft?.submitted]);

  const persistDraftSnapshot = (nextDraft: TrainingSessionDraft): void => {
    if (questions.length === 0) return;
    const startedAt = startedAtRef.current ?? new Date().toISOString();
    startedAtRef.current = startedAt;
    upsertSession({
      id: sessionId,
      taskId: baseTask?.id ?? task?.id ?? null,
      moduleId: questions[0]?.moduleId ?? task?.moduleId ?? "言语理解",
      questionIds: questions.map((question) => question.id),
      answers: { ...answersRef.current },
      startedAt,
      finishedAt: null,
      totalSeconds: totalWithActive(answersRef.current, nextDraft),
      draft: { ...nextDraft, answerChanges: { ...nextDraft.answerChanges } },
      wrongIds: wrongQuestionIds(questions, answersRef.current),
    });
  };

  const pauseSession = (): void => {
    if (phase !== "running" || !draft || draft.submitted) return;
    const currentSeconds = activeQuestionSeconds();
    const pausedDraft: TrainingSessionDraft = {
      ...draft,
      phase: "paused",
      currentQuestionSeconds: currentSeconds,
      savedAt: new Date().toISOString(),
    };
    stopTimer();
    activeQuestionBaseSeconds.current = currentSeconds;
    persistDraftSnapshot(pausedDraft);
    setTotalSeconds(finalizedSeconds(answersRef.current) + currentSeconds);
    setDraft(pausedDraft);
    setPhase("paused");
  };

  useEffect(() => {
    const pauseForBackground = (): void => {
      if (document.visibilityState === "hidden") pauseSession();
    };
    document.addEventListener("visibilitychange", pauseForBackground);
    window.addEventListener("pagehide", pauseForBackground);
    return () => {
      document.removeEventListener("visibilitychange", pauseForBackground);
      window.removeEventListener("pagehide", pauseForBackground);
    };
  });

  useEffect(() => () => stopTimer(), []);

  const mergeTrainingResult = (
    moduleId: string,
    questionsN: number,
    correctN: number,
    perQuestion: number,
  ): void => {
    const existing = imports.find(
      (item) => item.source === "系统训练" && item.modules.some((module) => module.id === moduleId),
    );
    if (existing) {
      const modules = existing.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              questions: (module.questions ?? 0) + questionsN,
              correct: (module.correct ?? 0) + correctN,
              secondsPerQuestion: Math.round(((module.secondsPerQuestion ?? perQuestion) + perQuestion) / 2),
            }
          : module,
      );
      const nextImport = { ...existing, modules };
      upsertImport(nextImport);
      setBaseline(computeBaseline(imports.map((item) => (item.id === existing.id ? nextImport : item))));
      return;
    }
    const record = {
      id: `train-${Date.now()}`,
      source: "系统训练" as const,
      platform: "见岸训练",
      examLabel: `训练·${moduleId}`,
      importedAt: new Date().toISOString(),
      totalScore: null,
      modules: [{
        id: moduleId as never,
        score: Math.round((correctN / Math.max(questionsN, 1)) * 200) / 10,
        questions: questionsN,
        correct: correctN,
        secondsPerQuestion: Math.round(perQuestion),
      }],
    };
    addImport(record);
    setBaseline(computeBaseline([...imports, record]));
  };

  const finish = (): void => {
    const unansweredCurrentSeconds = activeSecondsForState();
    stopTimer();
    const answers = { ...answersRef.current };
    const answered = questions.filter((question) => {
      const answer = answers[question.id];
      return answer != null && !answer.skipped && answer.choice != null;
    });
    const correctCount = answered.filter((question) => answers[question.id]!.choice === question.answerIndex).length;
    const freshWrong = answered.filter((question) => answers[question.id]!.choice !== question.answerIndex);
    const nextWrongIds = freshWrong.map((question) => question.id);
    const total = finalizedSeconds(answers) + unansweredCurrentSeconds;

    const entries = freshWrong.map((question) => {
      const answer = answers[question.id]!;
      const suggestion = suggestErrorCause(question, answer.choice!, answer.seconds);
      return {
        questionId: question.id,
        moduleId: question.moduleId,
        addedAt: new Date().toISOString(),
        status: suggestion.needsUserConfirm ? ("待确认" as const) : ("待判断" as const),
        suggested: suggestion,
        confirmedCause: null,
        retestLog: [],
      };
    });
    if (entries.length > 0) addWrongEntries(entries);

    addAttemptRecords(answered.map((question) => {
      const answer = answers[question.id]!;
      return {
        moduleId: question.moduleId,
        questionType: question.type,
        knowledgePoint: question.knowledgePoint,
        correct: answer.choice === question.answerIndex,
        seconds: answer.seconds,
        answerChanges: answerChanges[question.id] ?? 0,
        at: new Date().toISOString(),
      };
    }));

    // F0150 关注库：高耗时但答对的题需要单独跟踪，不进错题本
    for (const question of answered) {
      const answer = answers[question.id]!;
      const isHesitantCorrect = answer.choice === question.answerIndex && answer.seconds >= 90;
      if (isHesitantCorrect && !useProfileStore.getState().watchlist.includes(question.id)) {
        toggleWatchlist(question.id);
      }
    }

    const firstAnswered = answered[0];
    if (answered.length > 0 && firstAnswered) {
      const elapsed = answered.reduce((sum, question) => sum + answers[question.id]!.seconds, 0);
      mergeTrainingResult(firstAnswered.moduleId, answered.length, correctCount, elapsed / answered.length);
    }

    const record: TrainingSession = {
      id: sessionId,
      taskId: baseTask?.id ?? task?.id ?? null,
      moduleId: firstAnswered?.moduleId ?? questions[0]?.moduleId ?? "言语理解",
      questionIds: questions.map((question) => question.id),
      answers,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      totalSeconds: total,
      wrongIds: nextWrongIds.length > 0 ? nextWrongIds : undefined,
    };
    upsertSession(record);

    if (task) {
      const met = correctCount / Math.max(answered.length, 1) >= 0.75 && answered.length >= 5;
      addTaskResult({
        taskId: baseTask?.id ?? task.id,
        completedAt: new Date().toISOString(),
        minutes: Math.max(1, Math.round(total / 60)),
        questions: answered.length,
        correct: correctCount,
        metCriteria: met,
      });
    }
    setDraft(null);
    setTotalSeconds(total);
    setWrongIds(nextWrongIds);
    setPhase("result");
  };

  const begin = (): void => {
    if (!hydrated || questions.length === 0) return;
    const startedAt = new Date().toISOString();
    const firstQuestion = questions[0]!;
    answersRef.current = {};
    choiceRef.current = {};
    startedAtRef.current = startedAt;
    activeQuestionBaseSeconds.current = 0;
    restoredSessionId.current = sessionId;
    setIndex(0);
    setChoice(null);
    setSubmitted(false);
    setWrongIds([]);
    setAnswerChanges({});
    setTotalSeconds(0);
    setDraft({
      phase: "running",
      currentQuestionId: firstQuestion.id,
      currentQuestionSeconds: 0,
      selectedChoice: null,
      submitted: false,
      answerChanges: {},
      savedAt: startedAt,
    });
    setPhase("running");
  };

  const submitAnswer = (): void => {
    const question = questions[index];
    if (!question || choice == null || !draft) return;
    const seconds = Math.max(1, activeQuestionSeconds());
    stopTimer();
    answersRef.current[question.id] = { choice, seconds, skipped: false };
    choiceRef.current[question.id] = choice;
    const isWrong = choice !== question.answerIndex;
    if (isWrong) setWrongIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    setTotalSeconds(finalizedSeconds(answersRef.current));
    setSubmitted(true);
    setDraft((current) => current
      ? { ...current, selectedChoice: choice, submitted: true, currentQuestionSeconds: 0, savedAt: new Date().toISOString() }
      : current);
  };

  const moveToNext = (): void => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      finish();
      return;
    }
    const nextQuestion = questions[nextIndex]!;
    activeQuestionBaseSeconds.current = 0;
    setIndex(nextIndex);
    setChoice(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintLevel(0);
    setTotalSeconds(finalizedSeconds(answersRef.current));
    setDraft((current) => current
      ? {
          ...current,
          phase: "running",
          currentQuestionId: nextQuestion.id,
          currentQuestionSeconds: 0,
          selectedChoice: null,
          submitted: false,
          savedAt: new Date().toISOString(),
        }
      : current);
  };

  const skipQuestion = (): void => {
    const question = questions[index];
    if (!question || !draft) return;
    const seconds = Math.max(1, activeQuestionSeconds());
    stopTimer();
    answersRef.current[question.id] = { choice: null, seconds, skipped: true };
    choiceRef.current[question.id] = -1;
    setChoice(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintLevel(0);
    setTotalSeconds(finalizedSeconds(answersRef.current));
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      finish();
      return;
    }
    const nextQuestion = questions[nextIndex]!;
    activeQuestionBaseSeconds.current = 0;
    setIndex(nextIndex);
    setDraft((current) => current
      ? {
          ...current,
          phase: "running",
          currentQuestionId: nextQuestion.id,
          currentQuestionSeconds: 0,
          selectedChoice: null,
          submitted: false,
          savedAt: new Date().toISOString(),
        }
      : current);
  };

  const resumeSession = (): void => {
    if (!draft) return;
    setDraft((current) => current ? { ...current, phase: "running", savedAt: new Date().toISOString() } : current);
    setPhase("running");
  };

  const answeredList = questions.filter((question) => {
    const answer = answersRef.current[question.id];
    return answer != null && !answer.skipped && answer.choice != null;
  });
  const correctCount = answeredList.filter((question) => answersRef.current[question.id]!.choice === question.answerIndex).length;
  const accuracy = answeredList.length > 0 ? correctCount / answeredList.length : 0;
  const causeCount = new Map<string, number>();
  for (const question of answeredList) {
    const answer = answersRef.current[question.id]!;
    if (answer.choice === question.answerIndex) continue;
    const suggestion = suggestErrorCause(question, answer.choice!, answer.seconds);
    const cause = suggestion.cause ?? "待确认";
    causeCount.set(cause, (causeCount.get(cause) ?? 0) + 1);
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
              {baselineText(questions[0]?.moduleId, baseline.modules.find((module) => module.id === questions[0]?.moduleId)?.accuracy, accuracy)}
            </p>
          </Card>
        ) : null}

        {causeCount.size > 0 ? (
          <Card className="mt-lg">
            <p className="text-label-md text-muted">错因构成</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {[...causeCount.entries()].map(([cause, count]) => (
                <li key={cause}>{cause} · {count} 题</li>
              ))}
            </ul>
            {wrongIds.length > 0 ? (
              <Button className="mt-md" variant="secondary" onClick={() => router.push("/train/wrongbook")}>确认错因并修复</Button>
            ) : null}
          </Card>
        ) : null}

        {task ? <Chip tone={met ? "insight" : "warning"}>{met ? "本次处方任务已达标" : "处方任务未达标，已记入下次调整"}</Chip> : null}
        {(() => {
          const next = nextStepSuggestion({ met, wrongCount: wrongIds.length, remainingMinutes: 0 });
          return (
            <Card className="mt-md" padding="dense">
              <p className="text-label-md text-muted">下一步</p>
              <p className="mt-xs text-body-sm text-body">{next.reason}</p>
              <Link href={next.href} className="mt-xs inline-block text-label-md text-primary">{next.label} →</Link>
            </Card>
          );
        })()}

        <div className="sticky bottom-0 mt-xl bg-canvas pt-md">
          <Button fullWidth onClick={() => router.push("/today")}>接受下一步调整，返回今日</Button>
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
            <div className="flex gap-sm"><dt className="w-20 shrink-0 text-muted">题量</dt><dd>{questions.length} 题</dd></div>
            {task ? <><div className="flex gap-sm"><dt className="w-20 shrink-0 text-muted">预估</dt><dd>{task.minutes} 分钟</dd></div><div className="flex gap-sm"><dt className="w-20 shrink-0 text-muted">成功判定</dt><dd>{task.successCriteria}</dd></div></> : null}
          </dl>
        </Card>
        <p className="mt-md text-caption text-muted">作答会即时保存；中途退出不会丢失已答内容。</p>
        <Button className="mt-lg" fullWidth onClick={begin} disabled={!hydrated || questions.length === 0}>{hydrated ? "开始" : "正在读取训练记录…"}</Button>
      </main>
    );
  }

  const q = questions[index];
  if (!q) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <EmptyState why="训练题目已不可用。" action="请返回训练中心重新开始；此前已确认的作答仍被保留。" />
      </main>
    );
  }

  if (phase === "paused") {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <p className="text-micro text-primary">训练已暂停</p>
        <h1 className="mt-sm text-headline-lg text-ink">第 {index + 1} 题已保存。</h1>
        <Card className="mt-lg">
          <p className="text-body-sm text-body">已确认 {Object.keys(answersRef.current).length} 题 · 本题已用时 {formatDur(draft?.currentQuestionSeconds ?? 0)}</p>
        </Card>
        <Button className="mt-lg" fullWidth onClick={resumeSession}>继续作答</Button>
        <Button className="mt-sm" variant="tertiary" fullWidth onClick={finish}>结束训练</Button>
      </main>
    );
  }

  // F0111/F0171：按该题型历史正确率决定最高提示层级（掌握后归零）
  const typeAccuracy = computeAbilityDimensions(attemptRecords).byType.find((item) => item.type === q.type)?.accuracy ?? null;
  const maxHintLevel = scaffoldLevel(typeAccuracy);
  const isCorrect = submitted && choice === q.answerIndex;
  const selected = choice;
  const currentQuestionDuration = submitted
    ? answersRef.current[q.id]?.seconds ?? 0
    : activeSecondsForState();

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-margin-mobile pb-xl pt-md">
      <div className="flex items-center gap-md">
        <span className="text-label-md text-muted">{index + 1} / {questions.length}</span>
        <div className="flex-1"><ProgressTrack value={(index + (submitted ? 1 : 0)) / questions.length} label="题目进度" /></div>
        <span className="text-label-md text-muted tabular-nums" aria-label="训练总用时">{formatDur(totalSeconds)}</span>
        <span className="text-caption text-muted tabular-nums" aria-label="本题用时">本题 {formatDur(currentQuestionDuration)}</span>
      </div>

      <Card key={q.id} tone="warm" padding="standard" className="mt-lg">
        <div className="flex items-center gap-sm"><Chip tone="neutral">{q.type}</Chip><span className="text-caption text-muted-soft">{q.knowledgePoint}</span></div>
        {q.material ? (
          <div className="mt-md overflow-x-auto rounded-sm border border-border bg-surface p-md">
            <p className="text-label-md text-ink">{q.material.title}</p>
            <table className="mt-sm w-full text-caption text-body"><thead><tr className="text-left text-muted">{q.material.columns.map((column) => <th key={column} className="py-xxs pr-md font-medium">{column}</th>)}</tr></thead><tbody>{q.material.rows.map((row) => <tr key={row.label} className="border-t border-border"><td className="py-xxs pr-md">{row.label}</td>{row.values.map((value, valueIndex) => <td key={valueIndex} className="py-xxs pr-md tabular-nums">{value}</td>)}</tr>)}</tbody></table>
            {q.material.note ? <p className="mt-xs text-micro text-muted-soft">{q.material.note}</p> : null}
          </div>
        ) : null}
        <p className="mt-md whitespace-pre-line text-body-lg text-ink">{q.stem}</p>
      </Card>

      <div className="mt-lg space-y-md" role="radiogroup" aria-label="答案选项">
        {q.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const isAnswer = optionIndex === q.answerIndex;
          const state = !submitted
            ? isSelected ? "border-primary bg-primary-faint" : "border-border bg-surface hover:bg-surface-soft"
            : isAnswer ? "border-success bg-success-soft" : isSelected ? "border-error bg-error-soft" : "border-border bg-surface opacity-80";
          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-correct={isAnswer ? "1" : undefined}
              data-testid={isAnswer ? "answer-correct" : undefined}
              disabled={submitted}
              onClick={() => {
                const nextChanges = choice != null && choice !== optionIndex
                  ? { ...answerChanges, [q.id]: (answerChanges[q.id] ?? 0) + 1 }
                  : answerChanges;
                const elapsed = activeQuestionSeconds();
                setChoice(optionIndex);
                setAnswerChanges(nextChanges);
                setDraft((current) => current
                  ? { ...current, selectedChoice: optionIndex, currentQuestionSeconds: elapsed, answerChanges: nextChanges, savedAt: new Date().toISOString() }
                  : current);
              }}
              className={`flex w-full items-start gap-md rounded-md border p-md text-left text-body-md text-ink transition-colors ${state}`}
              style={{ transitionDuration: `${duration.fast}ms` }}
            >
              <span className="mt-xxs flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-label-md">{"ABCD"[optionIndex]}</span>
              <span>{option}</span>
              {submitted && isAnswer ? <span aria-hidden="true">✓</span> : null}
              {submitted && isSelected && !isAnswer ? <span aria-hidden="true">✕</span> : null}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <div className="mt-lg flex items-center gap-md">
          {/* F0111/F0171 脚手架渐隐：该题型已稳定掌握时不再提供分级提示 */}
          {maxHintLevel > 0 ? (
            <Button variant="tertiary" onClick={() => { setHintOpen(true); setHintLevel((level) => (level === 0 ? 1 : 2) > maxHintLevel ? maxHintLevel : (level === 0 ? 1 : 2)); }} aria-expanded={hintOpen}>AI 提示</Button>
          ) : (
            <span className="text-caption text-muted">该题型已稳定，先独立作答</span>
          )}
          <Button variant="tertiary" onClick={() => toggleFavorite(q.id)} aria-pressed={favorites.includes(q.id)}>{favorites.includes(q.id) ? "已收藏" : "收藏"}</Button>
          <Button variant="tertiary" onClick={skipQuestion}>跳过，稍后回看</Button>
          <span className="flex-1" />
          <Button variant="tertiary" onClick={pauseSession}>暂停</Button>
          <Button variant="tertiary" onClick={finish}>结束训练</Button>
        </div>
      ) : null}

      {hintOpen && !submitted ? (
        <div className="mt-sm space-y-sm">
          {hintLevel >= 1 && maxHintLevel >= 1 ? <p className="rounded-md bg-surface-soft p-md text-body-sm text-body">先想一下：这道题真正问的是「{q.knowledgePoint}」里的哪一个量？你在材料里定位到哪一行了？</p> : null}
          {hintLevel >= 2 && maxHintLevel >= 2 ? <p className="rounded-md bg-surface-soft p-md text-body-sm text-body">策略提示：这道题用「{q.skillTarget}」的常规路径最稳；先列式再代入，别急着精算。</p> : null}
        </div>
      ) : null}

      {submitted ? (
        <div className="mt-lg" style={{ animation: "none", transform: "translateY(0)", opacity: 1, transition: `opacity ${duration.content}ms ${easing.enter}` }}>
          <div className={`rounded-md border p-md ${isCorrect ? "border-success bg-success-soft" : "border-error bg-error-soft"}`}>
            <p className="text-body-md text-ink">{isCorrect ? `对。用时 ${formatDur(currentQuestionDuration)}，这道题考的是${q.knowledgePoint}。` : `这次错了。用时 ${formatDur(currentQuestionDuration)}；先看差在哪，再看正确路径。`}</p>
          </div>
          <div className="mt-md rounded-md border border-border bg-surface p-md"><p className="text-label-md text-muted">解析</p><p className="mt-xs text-body-sm text-body">{q.explanation}</p></div>
          <Card className="mt-md" padding="dense">
            {(() => {
              const feedback = strategyFeedback(q, { questionId: q.id, changes: [], final: choice, seconds: currentQuestionDuration });
              return <><p className="text-label-md text-muted">策略反馈</p><p className="mt-xs text-body-sm text-body">{feedback.conclusion}</p><p className="mt-xs text-caption text-muted">{feedback.evidence}</p><p className="mt-xs text-body-sm text-primary">下一步：{feedback.next}</p><p className="mt-xs text-micro text-muted-soft">答案修改 {answerChanges[q.id] ?? 0} 次 · 题目版本 {questionVersionHistory(q)[0]?.version ?? "seed-v1"}</p></>;
            })()}
          </Card>
          {/* F0140 错后近邻题：答错时立刻给同知识点的不同题干，作为下一步练习目标 */}
          {!isCorrect ? (() => {
            const neighbors = neighborQuestions(q, 2);
            if (neighbors.length === 0) return null;
            return (
              <Card className="mt-md" padding="dense">
                <p className="text-label-md text-muted">同知识点近邻题（F0140）</p>
                {neighbors.map((neighbor) => (
                  <p key={neighbor.id} className="mt-xs text-caption text-body">· {neighbor.stem.split("\n")[0]?.slice(0, 48)}…</p>
                ))}
                <Link href={`/train/session/retest-${encodeURIComponent(q.id)}`} className="mt-sm inline-block text-label-md text-primary">
                  用这些题复测「{q.knowledgePoint}」→
                </Link>
              </Card>
            );
          })() : null}
          <Button className="mt-lg" fullWidth onClick={moveToNext}>{index + 1 >= questions.length ? "查看训练总结" : "下一题"}</Button>
        </div>
      ) : (
        <Button className="mt-xl" fullWidth disabled={choice == null} onClick={submitAnswer}>提交本题</Button>
      )}

      <WrongbookBridge retestSourceId={retestSourceId} wrongBook={wrongBook} updateWrongEntry={updateWrongEntry} submitted={submitted} q={q} choice={choice} />
    </main>
  );
}

function WrongbookBridge({
  retestSourceId,
  wrongBook,
  updateWrongEntry,
  submitted,
  q,
  choice,
}: {
  retestSourceId: string | null;
  wrongBook: ReturnType<typeof useProfileStore.getState>["wrongBook"];
  updateWrongEntry: ReturnType<typeof useProfileStore.getState>["updateWrongEntry"];
  submitted: boolean;
  q: Question | undefined;
  choice: number | null;
}): null {
  // 每次提交只允许回写一次复测：写入会改变 wrongBook，若把它放进依赖会反复触发，
  // 从而在没有第二次真实作答的情况下把「验证中」推成「已修复」。
  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!submitted || !retestSourceId || !q || choice == null) {
      if (!submitted) recordedFor.current = null;
      return;
    }
    const key = `${retestSourceId}:${q.id}:${choice}`;
    if (recordedFor.current === key) return;
    const entry = useProfileStore.getState().wrongBook.find((item) => item.questionId === retestSourceId);
    if (!entry) return;
    recordedFor.current = key;
    const next = recordRetest(entry, choice === q.answerIndex);
    updateWrongEntry(retestSourceId, { retestLog: next.retestLog, status: next.status });
  }, [submitted, retestSourceId, q, choice, updateWrongEntry]);
  void wrongBook;
  return null;
}

function finalizedSeconds(answers: SessionAnswers): number {
  return Object.values(answers).reduce((sum, answer) => sum + Math.max(0, answer.seconds), 0);
}

function totalWithActive(answers: SessionAnswers, draft: TrainingSessionDraft): number {
  return finalizedSeconds(answers) + (draft.submitted ? 0 : draft.currentQuestionSeconds);
}

function wrongQuestionIds(questions: Question[], answers: SessionAnswers): string[] {
  return questions
    .filter((question) => {
      const answer = answers[question.id];
      return answer != null && !answer.skipped && answer.choice != null && answer.choice !== question.answerIndex;
    })
    .map((question) => question.id);
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

function formatDur(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
