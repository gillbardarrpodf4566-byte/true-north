"use client";

/**
 * Progress — §11.9：回答「我是否在正确方向上变好」。
 * 顶部是阶段性判断（一句话），不是大总分。
 * F0277 总分趋势 / F0278 模块趋势 / F0281 与个人基线比较 / F0282 目标距离。
 * §13.3：比较顺序 = 自己的过去 → 目标线 →（可选）群体。
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/StateViews";
import { TrendLine } from "@/components/charts/TrendLine";
import { useProfileStore } from "@/lib/profile/store";
import { MODULES, TOTAL_FULL_SCORE } from "@/lib/profile/types";
import { aggregateErrorCauses, forecastScore } from "@/lib/insights/v1";
import { computeAbilityDimensions } from "@/lib/ability/dimensions";
import { questionById } from "@/lib/questions/seed";

export default function ProgressPage() {
  const { imports, baseline, profile, taskResults, sessions, attemptRecords, profileCorrections, addProfileCorrection, prescription, wrongBook } = useProfileStore();
  const [correctionText, setCorrectionText] = useState("");

  const exams = useMemo(
    () =>
      imports
        .filter((im) => im.source !== "系统训练")
        .sort((a, b) => a.importedAt.localeCompare(b.importedAt)),
    [imports],
  );

  const summary = useMemo((): string => {
    if (exams.length === 0) return "还没有足够的模考数据来判断方向。";
    const totals = exams.map((e) => e.totalScore).filter((v): v is number => v != null);
    if (totals.length >= 2) {
      const delta = totals[totals.length - 1]! - totals[0]!;
      return delta > 0
        ? `最近 ${exams.length} 次模考总分在上升（+${round1(delta)} 分），方向正确。`
        : delta < 0
          ? `总分较首次回落 ${round1(-delta)} 分；先看模块层，找出波动来自哪里。`
          : `总分与此前持平，变化更多发生在模块层。`;
    }
    return `已记录 ${exams.length} 次模考；再导入 1 次即可看到方向。`;
  }, [exams]);

  const totalTrend = exams
    .filter((e) => e.totalScore != null)
    .map((e) => ({ label: labelOf(e.importedAt), value: e.totalScore! / TOTAL_FULL_SCORE }));

  const moduleSeries = MODULES.map((m) => {
    const pts = exams
      .map((e) => e.modules.find((x) => x.id === m))
      .map((x, i) => ({
        x,
        label: labelOf(exams[i]!.importedAt),
      }))
      .filter(({ x }) => x?.score != null)
      .map(({ x, label }) => ({ label, value: (x!.score! / 40) }));
    return { moduleId: m, points: pts };
  }).filter((s) => s.points.length >= 2);

  const latestModules = exams[exams.length - 1]?.modules ?? [];
  // F0297 连续有效学习天数（至少完成一项任务才算，不靠打开 App 打卡）
  const effectiveStreak = (() => {
    const days = new Set(taskResults.filter((r) => r.metCriteria).map((r) => r.completedAt.slice(0, 10)));
    let n = 0;
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
      if (!days.has(d)) break;
      n += 1;
    }
    return n;
  })();

  // V1 能力画像：从实际会话轨迹派生题型/稳定性/自动化/遗忘风险（F0071/F0074–0076）
  const ability = useMemo(() => {
    // 已有 V1 轨迹优先；老会话兼容性回放作为回退
    const attempts = attemptRecords.length > 0
      ? attemptRecords
      : sessions.filter((s) => s.finishedAt != null).flatMap((s) => Object.entries(s.answers).map(([qid, a]) => {
          const q = questionById(qid);
          return {
            moduleId: s.moduleId,
            questionType: q?.type ?? "未标注题型",
            knowledgePoint: q?.knowledgePoint ?? "未标注知识点",
            correct: q != null && a.choice === q.answerIndex,
            seconds: a.seconds,
            answerChanges: 0,
            at: s.finishedAt ?? s.startedAt,
          };
        }));
    return computeAbilityDimensions(attempts);
  }, [attemptRecords, sessions]);

  // F0280 训练量：来自任务完成记录；未关联任务的会话只计时长与题量
  const trainStats = (() => {
    const minutes = taskResults.reduce((s, r) => s + r.minutes, 0);
    const questions =
      taskResults.reduce((s, r) => s + (r.questions ?? 0), 0) +
      sessions.filter((s2) => s2.taskId == null && s2.finishedAt != null).length * 8;
    const doneTasks = taskResults.length;
    const completionRate =
      prescription == null || prescription.tasks.length === 0
        ? 100
        : Math.round((doneTasks / prescription.tasks.length) * 100);
    return {
      minutes,
      questions: Math.max(questions, doneTasks * 5),
      completionRate: Math.min(100, completionRate),
    };
  })();

  if (exams.length === 0 && !baseline) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
        <h1 className="text-headline-xl text-ink">进展</h1>
        <div className="mt-xl">
          <EmptyState
            why="还没有足够数据形成趋势。"
            action="完成 2 次模考或 3 次专项训练后，这里会开始出现你的个人基线与趋势。"
            cta="去导入成绩"
            onAction={() => (window.location.href = "/import")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">进展</h1>
      <p className="mt-sm text-body-md text-body">{summary}</p>
      {profile.goal ? (
        <p className="mt-xs text-caption text-muted">
          目标 {profile.goal.targetTotal} 分
          {baseline
            ? ` · 当前估算 ${round1(
                baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0),
              )} 分 · 差距 ${round1(
                profile.goal.targetTotal -
                  baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0),
              )} 分`
            : ""}
        </p>
      ) : null}

      <div className="mt-xl space-y-lg">
        {totalTrend.length >= 2 ? (
          <TrendLine
            title="总分趋势"
            points={totalTrend}
            unit=""
            baseline={
              baseline
                ? baseline.modules.reduce((s, m) => s + (m.accuracy ?? 0) * fullOf(m.id), 0) /
                  TOTAL_FULL_SCORE
                : null
            }
            height={140}
          />
        ) : null}

        {moduleSeries.length > 0 ? (
          <section>
            <h2 className="text-title-lg text-ink">模块趋势</h2>
            <p className="mt-xs text-caption text-muted">正确率按场次；虚线为该模块个人基线。</p>
            <div className="mt-md space-y-lg">
              {moduleSeries.map((s) => (
                <TrendLine
                  key={s.moduleId}
                  title={s.moduleId}
                  points={s.points}
                  unit="%"
                  baseline={baseline?.modules.find((m) => m.id === s.moduleId)?.accuracy ?? null}
                  height={100}
                />
              ))}
            </div>
          </section>
        ) : null}

        {latestModules.length > 0 && baseline ? (
          <Card>
            <p className="text-label-md text-muted">最近一次 vs 个人基线</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {latestModules.map((m) => {
                const b = baseline.modules.find((x) => x.id === m.id)?.accuracy;
                if (m.score == null || b == null) return null;
                const delta = Math.round((m.score / fullOf(m.id) - b) * 100);
                return (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.id}</span>
                    <span className={delta >= 0 ? "text-success" : "text-warning"}>
                      {delta >= 0 ? `+${delta}` : delta} 个百分点
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        {/* F0280 训练量趋势：有效时长 / 题量 / 完成率 */}
        <Card>
          <p className="text-label-md text-muted">训练投入（全部记录）</p>
          <div className="mt-sm grid grid-cols-3 gap-sm text-center">
            <div>
              <p className="text-stat-md text-ink">{trainStats.minutes}</p>
              <p className="text-caption text-muted">有效训练分钟</p>
            </div>
            <div>
              <p className="text-stat-md text-ink">{trainStats.questions}</p>
              <p className="text-caption text-muted">作答题数</p>
            </div>
            <div>
              <p className="text-stat-md text-ink">{trainStats.completionRate}%</p>
              <p className="text-caption text-muted">任务完成率</p>
            </div>
          </div>
        </Card>

        {/* F0122 阶段路线图 */}
        {profile.goal && profile.conditions ? (
          <Card>
            <p className="text-label-md text-muted">阶段路线图</p>
            <ol className="mt-md space-y-sm">
              {stageRoadmap(profile.conditions.stage, profile.goal.examDate).map((s, i) => (
                <li key={s.name} className="flex items-center gap-md">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-caption ${
                      s.current
                        ? "bg-primary text-on-primary"
                        : i < stageIndex(profile.conditions!.stage)
                          ? "bg-primary-soft text-primary-active"
                          : "bg-surface-strong text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-body-sm ${s.current ? "text-ink" : "text-body"}`}>
                    {s.name}
                    <span className="ml-sm text-caption text-muted">{s.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        {/* F0297/F0298：真实有效学习天数与克制的里程碑确认 */}
        <Card>
          <p className="text-label-md text-muted">学习节奏</p>
          <p className="mt-xs text-stat-md text-ink">{effectiveStreak} 天</p>
          <p className="text-caption text-muted">连续有效学习（只计达到成功判定的任务）</p>
          {effectiveStreak > 0 && effectiveStreak % 7 === 0 ? <p className="mt-sm text-body-sm text-success">达成 {effectiveStreak} 天阶段节点。没有烟花——你已经有了可验证的投入证据。</p> : null}
        </Card>

        {/* V1 能力画像（F0071/F0074/F0075/F0076） */}
        <Card>
          <p className="text-label-md text-muted">能力画像</p>
          {ability.byType.length === 0 ? (
            <p className="mt-sm text-body-sm text-muted">完成至少 5 道同题型训练后，这里会出现题型能力。</p>
          ) : (
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {ability.byType.slice(0, 5).map((x) => <li key={x.type} className="flex justify-between"><span>{x.type}</span><span>{x.accuracy == null ? "样本不足" : `${Math.round(x.accuracy * 100)}%`} · {x.sample} 题</span></li>)}
            </ul>
          )}
          <p className="mt-md text-caption text-muted">稳定性：{ability.stability.level ?? "样本不足"} · 自动化：{ability.automation.ratio == null ? "样本不足" : `${Math.round(ability.automation.ratio * 100)}% 快且正确`}</p>
          {ability.forgetting.filter((x) => x.risk === "高").slice(0, 2).map((x) => <p key={x.knowledgePoint} className="mt-xs text-caption text-warning">复习到期：{x.knowledgePoint} · {x.note}</p>)}
          {/* F0079：用户可纠正画像判断，不静默覆盖 */}
          <div className="mt-md border-t border-border pt-md">
            <p className="text-caption text-muted">画像不符合你的实际情况？告诉系统（F0079）</p>
            <div className="mt-xs flex gap-sm">
              <input value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} aria-label="画像纠正" placeholder="如：我资料分析慢是因为晚上练" className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" />
              <button type="button" disabled={!correctionText.trim()} onClick={() => { addProfileCorrection({ scope: "知识点", key: "能力画像", userSays: correctionText.trim() }); setCorrectionText(""); }} className="rounded-sm border border-primary px-md text-caption text-primary disabled:opacity-40">纠正</button>
            </div>
            {profileCorrections.length > 0 ? <p className="mt-xs text-micro text-muted">已记录 {profileCorrections.length} 条用户纠正；后续诊断会与这些说明一并呈现。</p> : null}
          </div>
        </Card>

        {/* F0192/F0193 分数预测（区间，非伪精确） */}
        {(() => {
          const totals = exams
            .slice(-6)
            .map((e) => e.totalScore)
            .filter((v): v is number => v != null);
          const f = forecastScore(totals, baseline?.confidence ?? null);
          if (!f) return null;
          return (
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-label-md text-muted">当前水平预测（F0192）</p>
                <span className="text-caption text-muted">{f.dataNote}</span>
              </div>
              <p className="mt-sm text-stat-lg text-ink">
                {f.low} – {f.high}
              </p>
              <p className="mt-xs text-caption text-muted">{f.note}</p>
            </Card>
          );
        })()}

        {/* F0158/F0159/F0160 错因聚合 */}
        {wrongBook.length > 0 ? (
          <Card>
            <p className="text-label-md text-muted">错因聚合（按错因，不只按题型）</p>
            <ul className="mt-sm space-y-xs text-body-sm text-body">
              {aggregateErrorCauses(wrongBook)
                .ranking.slice(0, 4)
                .map((r) => (
                  <li key={r.cause} className="flex justify-between">
                    <span>{r.cause}</span>
                    <span className="text-muted">
                      {r.count} 题 · {r.share}%
                    </span>
                  </li>
                ))}
            </ul>
            <p className="mt-xs text-caption text-muted">
              复发率 {aggregateErrorCauses(wrongBook).relapseRate ?? "—"}% ·
              已修复 {aggregateErrorCauses(wrongBook).fixStatus.已修复} 题
            </p>
          </Card>
        ) : null}

        <Card className="text-center">
          <Link href="/progress/weekly" className="text-label-md text-primary">
            查看本周复盘 ›
          </Link>
        </Card>

        {/* V1 选岗入口（§10.1 进展域） */}
        <Card className="text-center">
          <Link href="/jobs" className="text-label-md text-primary">
            智能选岗（资格匹配 + 冲稳保候选）›
          </Link>
        </Card>
      </div>
    </main>
  );
}

function stageRoadmap(stage: string, examDate: string): Array<{ name: string; note: string; current: boolean }> {
  const days = Math.max(
    0,
    Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000),
  );
  const stages = [
    { name: "基础建立", note: "概念与常用方法过一遍" },
    { name: "强化", note: "专项与错因修复为主" },
    { name: "模考期", note: "整卷节奏与策略实验" },
    { name: "冲刺", note: "只做高收益项与状态维持" },
  ];
  const idx = stageIndex(stage);
  return stages.map((s, i) => ({
    ...s,
    note: i === idx ? `当前 · 距考试 ${days} 天` : s.note,
    current: i === idx,
  }));
}

function stageIndex(stage: string): number {
  return ["零基础", "基础", "强化", "冲刺"].indexOf(stage);
}

function labelOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

const round1 = (n: number): number => Math.round(n * 10) / 10;
