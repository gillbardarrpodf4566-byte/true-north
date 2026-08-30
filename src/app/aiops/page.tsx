"use client";

/**
 * AI 运营台（MVP 16 条：F0366–F0387）。
 * 评测是**真实的**：parser 评测集直接驱动 MockAiGateway 跑对抗/缺失/模糊用例，
 * 诊断评测集驱动 diagnose 引擎；回归门禁执行零容忍规则（Schema 失败 / 编造缺失）。
 * 配置与版本管理为 mock 持久化。
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAiopsStore } from "@/lib/aiops/store";
import { MockAiGateway } from "@/lib/ai/gateway";
import { getAiMetrics, summarizeAiCalls } from "@/lib/ai/metrics";
import { diagnose } from "@/lib/diagnosis/engine";
import type { BaselineSnapshot } from "@/lib/profile/store";
import type { ExamGoal, ModuleId } from "@/lib/profile/types";

const TABS = [
  ["model", "模型"],
  ["prompt", "Prompt"],
  ["eval", "评测"],
  ["monitor", "监控"],
  ["budget", "预算"],
] as const;

export default function AiOpsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("eval");
  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-baseline justify-between">
        <h1 className="text-headline-xl text-ink">AI 运营台</h1>
      </header>
      <nav aria-label="AI运营台导航" className="mt-lg flex flex-wrap gap-sm">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-md py-sm text-label-md ${
              tab === k ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-xl">
        {tab === "model" ? <ModelTab /> : null}
        {tab === "prompt" ? <PromptTab /> : null}
        {tab === "eval" ? <EvalTab /> : null}
        {tab === "monitor" ? <MonitorTab /> : null}
        {tab === "budget" ? <BudgetTab /> : null}
      </div>
    </main>
  );
}

function ModelTab() {
  const { providers, routing, locked, setRouting } = useAiopsStore();
  return (
    <section className="space-y-xl">
      <div>
        <h2 className="text-title-lg text-ink">Provider（F0366）</h2>
        <ul className="mt-md space-y-sm">
          {providers.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              {p.name} · 模型：{p.models.join("、")}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-title-lg text-ink">模型路由（F0367）</h2>
        <div className="mt-md space-y-md">
          {(["parse", "diagnose", "coach"] as const).map((fn) => (
            <label key={fn} className="block">
              <span className="text-label-md text-muted">
                {fn === "parse" ? "截图解析" : fn === "diagnose" ? "提分诊断" : "教练对话"}
              </span>
              <select
                value={routing[fn]}
                onChange={(e) => setRouting(fn, e.target.value)}
                className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              >
                {providers.flatMap((p) => p.models).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-title-lg text-ink">版本锁定（F0368）</h2>
        <p className="mt-md rounded-md border border-border bg-surface p-md text-body-sm text-body">
          生产锁定：{locked.model} · 发布于 {new Date(locked.releasedAt).toLocaleDateString("zh-CN")}
        </p>
      </div>
    </section>
  );
}

function PromptTab() {
  const { promptVersions, publishPrompt, rollbackPrompt, schemaVersions, addSchemaVersion } =
    useAiopsStore();
  return (
    <section className="space-y-xl">
      <div>
        <h2 className="text-title-lg text-ink">Prompt 版本（F0369）</h2>
        <ul className="mt-md space-y-sm">
          {promptVersions.map((p) => (
            <li key={p.v} className="rounded-md border border-border bg-surface p-md">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-ink">
                  {p.v} · {p.note}
                </span>
                <Chip tone={p.status === "已发布" ? "insight" : p.status === "已回滚" ? "warning" : "neutral"}>
                  {p.status}
                </Chip>
              </div>
              <div className="mt-sm flex gap-sm">
                {p.status !== "已发布" ? (
                  <Button variant="tertiary" onClick={() => publishPrompt(p.v)}>
                    发布
                  </Button>
                ) : (
                  <Button variant="tertiary" onClick={() => rollbackPrompt(p.v)}>
                    回滚
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-title-lg text-ink">Schema 版本（F0371）</h2>
        <ul className="mt-md space-y-sm">
          {schemaVersions.map((s) => (
            <li key={s.v} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              {s.v} · {s.note}
            </li>
          ))}
        </ul>
        <Button
          className="mt-md"
          variant="secondary"
          onClick={() => addSchemaVersion(`v${schemaVersions.length + 1}.0`, "字段扩展")}
        >
          新增 Schema 版本
        </Button>
      </div>
    </section>
  );
}

interface CaseResult {
  label: string;
  pass: boolean;
  detail: string;
}

function EvalTab() {
  const { evalRuns, recordEvalRun } = useAiopsStore();
  const [running, setRunning] = useState(false);

  const runParser = async (): Promise<void> => {
    setRunning(true);
    const gw = new MockAiGateway();
    const results: CaseResult[] = [];
    const normal = await gw.parseScoreScreenshot({ fileName: "eval-normal.png", sizeBytes: 10 });
    results.push({
      label: "正常截图",
      pass: normal.totalScore != null && normal.modules.every((m) => m.score != null),
      detail: `totalScore=${normal.totalScore}`,
    });
    const partial = await gw.parseScoreScreenshot({ fileName: "eval-partial.png", sizeBytes: 20 });
    const missingFlagged = partial.modules.some((m) => m.score == null);
    results.push({
      label: "缺失字段（禁止编造）",
      pass: missingFlagged && partial.totalScore == null,
      detail: missingFlagged ? "缺失字段已标记 missing" : "错误：缺失字段被编造",
    });
    const lowconf = await gw.parseScoreScreenshot({ fileName: "eval-lowconf.png", sizeBytes: 30 });
    results.push({
      label: "低置信标记",
      pass: Object.values(lowconf.confidence).includes("low"),
      detail: "存在 low 置信字段",
    });
    let corruptThrew = false;
    try {
      await gw.parseScoreScreenshot({ fileName: "eval-corrupt.bin", sizeBytes: 1 });
    } catch {
      corruptThrew = true;
    }
    results.push({
      label: "对抗样本（应失败而非硬编）",
      pass: corruptThrew,
      detail: corruptThrew ? "解析失败被正确抛出" : "错误：对抗样本被硬解析",
    });
    finish("parser", results);
  };

  const runDiagnosis = async (): Promise<void> => {
    setRunning(true);
    const results: CaseResult[] = [];
    const goal: ExamGoal = {
      type: "国考",
      examName: "eval",
      region: "eval",
      examDate: "2026-11-29",
      targetTotal: 108,
      targetModules: {},
    };
    // 典型：达标但慢 → 速度机会应排第一
    const speedBase = makeBaseline([["资料分析", 0.82, 120], ["言语理解", 0.7, 50]]);
    const d1 = diagnose(speedBase, goal, null);
    results.push({
      label: "典型：速度机会优先",
      pass: d1.opportunities[0]?.moduleId === "资料分析" && d1.opportunities[0]?.kind === "速度",
      detail: `top=${d1.opportunities[0]?.moduleId ?? "无"}`,
    });
    // 边界：最弱项不得自动成为最高优先级（历史 Bug 回归）
    const weakBase = makeBaseline([["数量关系", 0.3, 100], ["资料分析", 0.85, 125]]);
    const d2 = diagnose(weakBase, goal, null);
    results.push({
      label: "边界：最弱≠最高优先",
      pass: d2.opportunities[0]?.moduleId !== "数量关系",
      detail: `top=${d2.opportunities[0]?.moduleId ?? "无"}`,
    });
    // 无数据不下结论
    const empty = diagnose(makeBaseline([]), goal, null);
    results.push({
      label: "空数据：不出结论",
      pass: empty.opportunities.length === 0,
      detail: `机会数=${empty.opportunities.length}`,
    });
    finish("diagnosis", results);
  };

  const finish = (suite: "parser" | "diagnosis", results: CaseResult[]): void => {
    const passed = results.filter((r) => r.pass).length;
    const schemaFail = results.filter((r) => r.label.includes("对抗")).filter((r) => !r.pass).length;
    const fabrication = results.filter((r) => r.label.includes("编造")).filter((r) => !r.pass).length;
    recordEvalRun({
      suite,
      passRate: Math.round((passed / results.length) * 100),
      failures: results.filter((r) => !r.pass).map((r) => r.label),
      // F0379 零容忍：对抗失败（=Schema 失败/幻觉类）直接 fail
      gateVerdict: schemaFail === 0 && fabrication === 0 ? "通过" : "拦截",
    });
    setRunning(false);
  };

  const lastParser = [...evalRuns].reverse().find((r) => r.suite === "parser");
  const lastDiag = [...evalRuns].reverse().find((r) => r.suite === "diagnosis");

  return (
    <section className="space-y-xl">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-lg text-ink">Parser 评测集（F0372）</h2>
          <Button variant="secondary" disabled={running} onClick={runParser}>
            运行
          </Button>
        </div>
        {lastParser ? <EvalReport run={lastParser} /> : <p className="mt-md text-body-sm text-muted">未运行。</p>}
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-lg text-ink">诊断评测集（F0373）</h2>
          <Button variant="secondary" disabled={running} onClick={runDiagnosis}>
            运行
          </Button>
        </div>
        {lastDiag ? <EvalReport run={lastDiag} /> : <p className="mt-md text-body-sm text-muted">未运行。</p>}
      </div>
      <Card>
        <p className="text-label-md text-muted">确定性 Grader（F0375）</p>
        <p className="mt-xs text-body-sm text-body">
          Schema 完整性、字段缺失不编造、数值范围、禁答行为均为程序化断言，不依赖模型自评。
        </p>
      </Card>
    </section>
  );
}

function EvalReport({
  run,
}: {
  run: { at: string; suite: string; passRate: number; failures: string[]; gateVerdict: string };
}) {
  return (
    <div className="mt-md rounded-md border border-border bg-surface p-md">
      <div className="flex items-center justify-between">
        <span className="text-label-md text-muted">
          {new Date(run.at).toLocaleString("zh-CN")} · 通过率 {run.passRate}%
        </span>
        <Chip tone={run.gateVerdict === "通过" ? "insight" : "warning"}>门禁 {run.gateVerdict}</Chip>
      </div>
      {run.failures.length > 0 ? (
        <p className="mt-xs text-caption text-warning">失败：{run.failures.join("、")}</p>
      ) : null}
    </div>
  );
}

function MonitorTab() {
  const metrics = useMemo(() => getAiMetrics(), []);
  const s = summarizeAiCalls();
  return (
    <section className="space-y-lg">
      <h2 className="text-title-lg text-ink">调用监控（本会话）</h2>
      <div className="grid grid-cols-2 gap-md">
        <Metric label="调用次数" value={String(s.total)} />
        <Metric label="成功率" value={`${Math.round(s.successRate * 100)}%`} />
        <Metric label="P50 / P95" value={`${s.p50} / ${s.p95} ms`} />
        <Metric label="Schema 失败率" value={`${Math.round(s.schemaFailRate * 100)}%`} />
        <Metric label="用户纠正率（F0386）" value={`${Math.round(s.correctionRate * 100)}%`} />
        <Metric label="Token 合计（F0384）" value={String(s.totalTokens)} />
      </div>
      <p className="text-caption text-muted">
        最近 {metrics.length} 条调用记录保存在进程内存；真实部署接入指标管道。
      </p>
    </section>
  );
}

function BudgetTab() {
  const { dailyBudget, setDailyBudget } = useAiopsStore();
  const s = summarizeAiCalls();
  const usedPct = Math.min(100, Math.round((s.totalTokens / Math.max(dailyBudget, 1)) * 100));
  return (
    <section>
      <h2 className="text-title-lg text-ink">预算与保护（F0387）</h2>
      <label className="mt-md block">
        <span className="text-label-md text-muted">日 Token 预算</span>
        <input
          inputMode="numeric"
          value={dailyBudget}
          onChange={(e) => setDailyBudget(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
          className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
        />
      </label>
      <div className="mt-lg h-2 w-full rounded-full bg-surface-strong">
        <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
      </div>
      <p className="mt-sm text-caption text-muted">
        本会话已用 {s.totalTokens} tokens（{usedPct}%）。超过 100% 触发降级：暂停解析类调用，训练与复盘不受影响。
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-md text-center">
      <p className="text-stat-md text-ink">{value}</p>
      <p className="text-caption text-muted">{label}</p>
    </div>
  );
}

/** 构造评测用基线 */
function makeBaseline(rows: Array<[ModuleId, number, number | null]>): BaselineSnapshot {
  return {
    computedAt: "eval",
    confidence: "高",
    dataNote: "",
    modules: rows.map(([id, acc, sec]) => ({
      id,
      accuracy: acc,
      accuracyLow: acc - 0.03,
      accuracyHigh: acc + 0.03,
      secondsPerQuestion: sec,
      sampleQuestions: 200,
    })),
  };
}
