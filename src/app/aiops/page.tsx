"use client";

/**
 * AI 运营台（服务端化）：配置与评测存 SQLite（ai_config / eval_runs 表），
 * 评测由服务端真实执行（/api/admin/aiops/eval），仅 aiops/admin 角色可读写（F0364）。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { adminApi, staffLogout, staffMe, type StaffIdentity } from "@/lib/auth/adminClient";
import { getAiMetrics, summarizeAiCalls } from "@/lib/ai/metrics";

const TABS = [
  ["model", "模型"],
  ["prompt", "Prompt"],
  ["eval", "评测"],
  ["essay", "申论评测"],
  ["monitor", "监控"],
  ["budget", "预算"],
] as const;

interface PromptVersion {
  v: string;
  status: "草稿" | "已发布" | "已回滚";
  note: string;
  /** F0370：保存提示词正文才能做真实逐行差异 */
  body?: string;
}

/** F0370：逐行差异；两侧都有正文时才能对比，缺失正文不臆造差异。 */
function promptDiff(before: string | undefined, after: string | undefined): string[] {
  if (!before || !after) return [];
  const left = before.split("\n");
  const right = after.split("\n");
  const lines: string[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const a = left[i];
    const b = right[i];
    if (a === b) { if (a != null) lines.push(`  ${a}`); continue; }
    if (a != null) lines.push(`- ${a}`);
    if (b != null) lines.push(`+ ${b}`);
  }
  return lines.slice(0, 30);
}

interface EvalRunRow {
  id: number;
  suite: string;
  pass_rate: number;
  failures: string;
  gate_verdict: string;
  run_by: string;
  at: string;
}

interface AioConfig {
  routing: { parse: string; diagnose: string; coach: string };
  daily_budget: number;
  prompt_versions: PromptVersion[];
  schema_versions: Array<{ v: string; note: string }>;
}

const MODELS = ["mock-parse-v1", "mock-diag-v1", "mock-coach-v1", "mock-parse-cand"];

export default function AiOpsPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AioConfig | null>(null);
  const [evalRuns, setEvalRuns] = useState<EvalRunRow[]>([]);
  const [feedbackClusters, setFeedbackClusters] = useState<Array<{ cluster: string; count: number; sample: string }>>([]);
  const [feedbackCandidates, setFeedbackCandidates] = useState<Array<{
    id: number;
    category: string;
    sanitizedExcerpt: string;
    redactionVersion: string;
    piiCategories: string[];
    provenanceStatus: "verified" | "unavailable";
    reviewStatus: "review_required" | "approved" | "blocked";
    producerKind: "model" | "rule_engine" | null;
    feature: string | null;
    modelVersion: string | null;
    promptVersion: string | null;
    schemaVersion: string | null;
  }>>([]);
  const [running, setRunning] = useState<string | null>(null);
  // F0377 抽样人工复核状态
  const [calibration, setCalibration] = useState<{
    samples: Array<{ id: string; questionId: string; questionTitle: string; excerpt: string; autoScore: number; fullScore: number }>;
    calibrations: Array<{ id: string; autoScore: number; humanScore: number; note: string; reviewedBy: string }>;
    meanGap: number | null;
    reviewed: number;
  }>({ samples: [], calibrations: [], meanGap: null, reviewed: 0 });
  const [humanScores, setHumanScores] = useState<Record<string, string>>({});
  const [calibNotes, setCalibNotes] = useState<Record<string, string>>({});
  const [lastOutcome, setLastOutcome] = useState<{
    suite: string;
    passRate: number;
    failures: string[];
    gateVerdict: string;
    results: Array<{ label: string; pass: boolean; detail: string }>;
  } | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("eval");

  const load = useCallback(async (): Promise<void> => {
    const d = await adminApi<AioConfig & { evalRuns: EvalRunRow[]; feedbackClusters?: Array<{ cluster: string; count: number; sample: string }>; feedbackCandidates?: typeof feedbackCandidates }>("/api/admin/aiops/config");
    if (d.ok) {
      setConfig({
        routing: d.routing ?? { parse: "mock-parse-v1", diagnose: "mock-diag-v1", coach: "mock-coach-v1" },
        daily_budget: Number(d.daily_budget ?? 500000),
        prompt_versions: d.prompt_versions ?? [],
        schema_versions: d.schema_versions ?? [],
      });
      setEvalRuns(d.evalRuns ?? []);
      setFeedbackClusters(d.feedbackClusters ?? []);
      setFeedbackCandidates(d.feedbackCandidates ?? []);
    }
  }, []);

  useEffect(() => {
    void staffMe().then((s) => {
      if (!s || (s.role !== "aiops" && s.role !== "admin")) {
        router.replace("/admin-login");
        return;
      }
      setStaff(s);
      void load().then(() => setLoading(false));
    });
  }, [router, load]);

  const saveConfig = useCallback(
    async (key: string, value: unknown): Promise<void> => {
      await adminApi("/api/admin/aiops/config", {
        method: "POST",
        body: JSON.stringify({ key, value }),
      });
      await load();
    },
    [load],
  );

  const runEval = useCallback(
    async (suite: "parser" | "diagnosis" | "essay"): Promise<void> => {
      setRunning(suite);
      const r = await adminApi<{
        suite: string;
        passRate: number;
        failures: string[];
        gateVerdict: string;
        results: Array<{ label: string; pass: boolean; detail: string }>;
      }>("/api/admin/aiops/eval", {
        method: "POST",
        body: JSON.stringify({ suite }),
      });
      setRunning(null);
      if (r.ok) {
        setLastOutcome(r);
        void load();
      }
    },
    [load],
  );

  const loadCalibration = useCallback(async (): Promise<void> => {
    const data = await adminApi<typeof calibration>("/api/admin/aiops/calibration");
    if (data.ok) setCalibration({ samples: data.samples ?? [], calibrations: data.calibrations ?? [], meanGap: data.meanGap ?? null, reviewed: data.reviewed ?? 0 });
  }, []);

  useEffect(() => {
    if (staff) void loadCalibration();
  }, [staff, loadCalibration]);

  const submitCalibration = useCallback(
    async (sample: { id: string; questionId: string; excerpt: string; autoScore: number }): Promise<void> => {
      const humanScore = Number(humanScores[sample.id]);
      if (!Number.isFinite(humanScore)) return;
      const data = await adminApi("/api/admin/aiops/calibration", {
        method: "POST",
        body: JSON.stringify({ sampleId: sample.id, questionId: sample.questionId, excerpt: sample.excerpt, autoScore: sample.autoScore, humanScore, note: calibNotes[sample.id] ?? "" }),
      });
      if (data.ok) {
        setHumanScores((current) => ({ ...current, [sample.id]: "" }));
        setCalibNotes((current) => ({ ...current, [sample.id]: "" }));
        await loadCalibration();
      }
    },
    [humanScores, calibNotes, loadCalibration],
  );

  const metricsSummary = useMemo(() => summarizeAiCalls(), []);
  const metricsCount = useMemo(() => getAiMetrics().length, []);

  if (loading || !staff) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pt-xl">
        <p className="text-body-md text-muted">正在验证员工身份…</p>
      </main>
    );
  }

  const lastParser = [...evalRuns].reverse().find((r) => r.suite === "parser");
  const lastDiag = [...evalRuns].reverse().find((r) => r.suite === "diagnosis");

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-baseline justify-between gap-sm">
        <div>
          <h1 className="text-headline-xl text-ink">AI 运营台</h1>
          <p className="mt-xs text-caption text-muted">
            {staff.display_name} · 配置与评测存服务端
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await staffLogout();
            router.replace("/admin-login");
          }}
          className="text-caption text-muted underline-offset-2 hover:underline"
        >
          退出
        </button>
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

      <div className="mt-xl space-y-xl">
        {tab === "model" && config ? (
          <>
            <section>
              <h2 className="text-title-lg text-ink">模型路由（F0367）</h2>
              <div className="mt-md space-y-md">
                {(["parse", "diagnose", "coach"] as const).map((fn) => (
                  <label key={fn} className="block">
                    <span className="text-label-md text-muted">
                      {fn === "parse" ? "截图解析" : fn === "diagnose" ? "提分诊断" : "教练对话"}
                    </span>
                    <select
                      value={config.routing[fn]}
                      onChange={(e) => void saveConfig("routing", { ...config.routing, [fn]: e.target.value })}
                      className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
                    >
                      {MODELS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
            <Card>
              <p className="text-label-md text-muted">版本锁定（F0368）</p>
              <p className="mt-xs text-body-sm text-body">
                已发布 Prompt 即锁定版本；回滚/发布记录进服务端审计。
              </p>
            </Card>
          </>
        ) : null}

        {tab === "essay" ? (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-title-lg text-ink">申论评测集（F0374/F0376）</h2>
              <Button variant="secondary" loading={running === "essay"} onClick={() => void runEval("essay")}>
                服务端运行
              </Button>
            </div>
            <p className="mt-xs text-caption text-muted">
              Rubric Grader：分数界/维度和/优先建议数/证据必填/置信必填/字数口径 + 评分一致性，全部确定性断言。
            </p>

            {/* F0377 抽样人工复核：记录人工分并给出自动 vs 人工偏差 */}
            <Card className="mt-md">
              <div className="flex items-baseline justify-between">
                <p className="text-label-md text-muted">抽样人工复核（F0377）</p>
                <span className="text-caption text-muted">
                  已复核 {calibration.reviewed} 条{calibration.meanGap != null ? ` · 平均偏差 ${calibration.meanGap} 分` : ""}
                </span>
              </div>
              <ul className="mt-sm space-y-md">
                {calibration.samples.map((sample) => {
                  const recorded = calibration.calibrations.find((item) => item.id === sample.id);
                  return (
                    <li key={sample.id} className="rounded-md border border-border bg-surface p-md">
                      <p className="text-caption text-ink">{sample.questionTitle} · 自动分 {sample.autoScore}/{sample.fullScore}</p>
                      <p className="mt-xxs text-caption text-muted">{sample.excerpt}…</p>
                      {recorded ? (
                        <p className="mt-xs text-caption text-primary">
                          人工分 {recorded.humanScore} · 偏差 {Math.round(Math.abs(recorded.autoScore - recorded.humanScore) * 10) / 10} 分 · {recorded.reviewedBy}
                          {recorded.note ? ` · ${recorded.note}` : ""}
                        </p>
                      ) : null}
                      <div className="mt-sm flex items-center gap-sm">
                        <input
                          aria-label={`人工分 ${sample.id}`}
                          inputMode="decimal"
                          value={humanScores[sample.id] ?? ""}
                          onChange={(e) => setHumanScores((current) => ({ ...current, [sample.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                          placeholder="人工分"
                          className="h-9 w-24 rounded-sm border border-border-strong bg-surface px-sm text-caption text-ink"
                        />
                        <input
                          aria-label={`复核说明 ${sample.id}`}
                          value={calibNotes[sample.id] ?? ""}
                          onChange={(e) => setCalibNotes((current) => ({ ...current, [sample.id]: e.target.value }))}
                          placeholder="偏差原因（可选）"
                          className="h-9 flex-1 rounded-sm border border-border-strong bg-surface px-sm text-caption text-ink"
                        />
                        <Button
                          variant="secondary"
                          disabled={!humanScores[sample.id]}
                          onClick={() => void submitCalibration(sample)}
                        >
                          记录
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-sm text-caption text-muted">人工分只用于校准偏差，不回写用户成绩。</p>
            </Card>
            {evalRuns.filter((r) => r.suite === "essay").length > 0 ? (
              <div className="mt-md space-y-md">
                {evalRuns
                  .filter((r) => r.suite === "essay")
                  .slice(0, 3)
                  .map((r) => (
                    <EvalReport key={r.id} row={r} />
                  ))}
              </div>
            ) : (
              <p className="mt-md text-body-sm text-muted">未运行。</p>
            )}
            {lastOutcome?.suite === "essay" ? <CaseResults outcome={lastOutcome} /> : null}
          </section>
        ) : null}

        {tab === "prompt" && config ? (
          <>
            <section>
              <h2 className="text-title-lg text-ink">Prompt 版本（F0369）</h2>
              <ul className="mt-md space-y-sm">
                {config.prompt_versions.map((p) => (
                  <li key={p.v} className="rounded-md border border-border bg-surface p-md">
                    <div className="flex items-center justify-between gap-sm">
                      <span className="text-body-sm text-ink">
                        {p.v} · {p.note}
                      </span>
                      <Chip tone={p.status === "已发布" ? "insight" : p.status === "已回滚" ? "warning" : "neutral"}>
                        {p.status}
                      </Chip>
                    </div>
                    <div className="mt-sm">
                      {p.status === "已发布" ? (
                        <Button
                          variant="tertiary"
                          onClick={() =>
                            void saveConfig(
                              "prompt_versions",
                              config.prompt_versions.map((x) =>
                                x.v === p.v
                                  ? { ...x, status: "已回滚" as const }
                                  : x.v.split(" ")[0] === p.v.split(" ")[0] && x.status === "已回滚"
                                    ? { ...x, status: "草稿" as const }
                                    : x,
                              ),
                            )
                          }
                        >
                          回滚
                        </Button>
                      ) : (
                        <Button
                          variant="tertiary"
                          onClick={() =>
                            void saveConfig(
                              "prompt_versions",
                              config.prompt_versions.map((x) =>
                                x.v === p.v
                                  ? { ...x, status: "已发布" as const }
                                  : x.v.split(" ")[0] === p.v.split(" ")[0] && x.status === "已发布"
                                    ? { ...x, status: "已回滚" as const }
                                    : x,
                              ),
                            )
                          }
                        >
                          发布
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {/* F0370 Prompt 版本差异：文本与状态对比，发布前必须跑回归 */}
              {config.prompt_versions.length >= 2 ? (
                <Card className="mt-md" padding="dense">
                  <p className="text-label-md text-muted">版本差异对比（F0370）</p>
                  {(() => {
                    const candidate = config.prompt_versions[config.prompt_versions.length - 1]!;
                    const published = [...config.prompt_versions].reverse().find((item) => item.status === "已发布" && item.v !== candidate.v);
                    const diff = promptDiff(published?.body, candidate.body);
                    return (
                      <>
                        <p className="mt-xs text-caption text-body">
                          候选「{candidate.v}」对比{published ? `已发布「${published.v}」` : "（暂无已发布版本）"}：{candidate.note}
                        </p>
                        {diff.length > 0 ? (
                          <ul className="mt-sm space-y-xxs">
                            {diff.map((line, index) => (
                              <li key={index} className={`text-micro ${line.startsWith("+") ? "text-success" : line.startsWith("-") ? "text-error" : "text-muted"}`}>
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-sm text-caption text-muted">
                            两个版本未保存提示词正文，无法逐行对比；请在版本中填写 body 后再发布。
                          </p>
                        )}
                        <p className="mt-sm text-caption text-muted">发布前请运行 Parser / 诊断 / 申论回归门禁。</p>
                      </>
                    );
                  })()}
                </Card>
              ) : null}
            </section>
            <section>
              <h2 className="text-title-lg text-ink">Schema 版本（F0371）</h2>
              <ul className="mt-md space-y-sm">
                {config.schema_versions.map((s) => (
                  <li key={s.v} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
                    {s.v} · {s.note}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-md"
                variant="secondary"
                onClick={() =>
                  void saveConfig("schema_versions", [
                    ...config.schema_versions,
                    { v: `parse-schema v${config.schema_versions.length + 1}.0`, note: "字段扩展" },
                  ])
                }
              >
                新增 Schema 版本
              </Button>
            </section>
          </>
        ) : null}

        {tab === "eval" ? (
          <>
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-title-lg text-ink">Parser 评测集（F0372）</h2>
                <Button variant="secondary" loading={running === "parser"} onClick={() => void runEval("parser")}>
                  服务端运行
                </Button>
              </div>
              {lastParser ? <EvalReport row={lastParser} /> : <p className="mt-md text-body-sm text-muted">未运行。</p>}
              {lastOutcome?.suite === "parser" ? <CaseResults outcome={lastOutcome} /> : null}
            </section>
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-title-lg text-ink">诊断评测集（F0373）</h2>
                <Button variant="secondary" loading={running === "diagnosis"} onClick={() => void runEval("diagnosis")}>
                  服务端运行
                </Button>
              </div>
              {lastDiag ? <EvalReport row={lastDiag} /> : <p className="mt-md text-body-sm text-muted">未运行。</p>}
              {lastOutcome?.suite === "diagnosis" ? <CaseResults outcome={lastOutcome} /> : null}
            </section>
            <Card>
              <p className="text-label-md text-muted">确定性 Grader（F0375）+ 回归门禁（F0378/F0379）</p>
              <p className="mt-xs text-body-sm text-body">
                Schema 完整性、缺失不编造、最弱≠最高优先均为程序断言；对抗/编造类失败零容忍直接拦截。
              </p>
            </Card>
          </>
        ) : null}

        {tab === "eval" ? (
          <Card>
            <p className="text-label-md text-muted">生产反馈候选池（F0380/F0381）</p>
            {feedbackClusters.length === 0 ? (
              <p className="mt-xs text-body-sm text-muted">暂无匿名化失败候选；用户纠错/工单会自动入池。</p>
            ) : (
              <>
                <ul className="mt-sm space-y-xs text-body-sm text-body">
                  {feedbackClusters.map((c) => <li key={c.cluster} className="flex justify-between"><span>{c.cluster} · 示例：{c.sample}</span><Chip tone={c.count >= 2 ? "warning" : "neutral"}>{c.count}</Chip></li>)}
                </ul>
                <p className="mt-sm text-caption text-muted">候选只显示经脱敏摘录；仅“来源已验证”的候选会展示实际生产者与版本，来源缺失的候选不可晋升回归用例。</p>
                <ul className="mt-sm space-y-sm">
                  {feedbackCandidates.map((candidate) => (
                    <li key={candidate.id} className="rounded-sm border border-border bg-surface p-sm text-caption text-body">
                      <p>{candidate.category} · {candidate.sanitizedExcerpt}</p>
                      <p className="mt-xxs text-muted">脱敏：{candidate.redactionVersion}{candidate.piiCategories.length ? `（${candidate.piiCategories.join("、")}）` : "（未检测到 PII）"} · 来源：{candidate.provenanceStatus === "verified" ? `${candidate.producerKind === "rule_engine" ? "规则引擎" : "模型"} ${candidate.feature ?? ""} ${candidate.modelVersion ?? ""} ${candidate.promptVersion ?? ""}` : "不可用（不可晋升）"} · 审核：{candidate.reviewStatus}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        ) : null}

        {tab === "monitor" ? (
          <section className="space-y-lg">
            <h2 className="text-title-lg text-ink">调用监控（本会话进程）</h2>
            <div className="grid grid-cols-2 gap-md">
              <Metric label="调用次数" value={String(metricsSummary.total)} />
              <Metric label="成功率" value={`${Math.round(metricsSummary.successRate * 100)}%`} />
              <Metric label="P50 / P95" value={`${metricsSummary.p50} / ${metricsSummary.p95} ms`} />
              <Metric label="Schema 失败率" value={`${Math.round(metricsSummary.schemaFailRate * 100)}%`} />
              <Metric label="用户纠正率（F0386）" value={`${Math.round(metricsSummary.correctionRate * 100)}%`} />
              <Metric label="Token 合计（F0384）" value={String(metricsSummary.totalTokens)} />
            </div>
            <p className="text-caption text-muted">最近 {metricsCount} 条记录保存在进程内存；真实部署接入指标管道。</p>
          </section>
        ) : null}

        {tab === "budget" && config ? (
          <section>
            <h2 className="text-title-lg text-ink">预算与保护（F0387）</h2>
            <label className="mt-md block">
              <span className="text-label-md text-muted">日 Token 预算</span>
              <input
                inputMode="numeric"
                value={config.daily_budget}
                onChange={(e) => void saveConfig("daily_budget", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              />
            </label>
            <p className="mt-sm text-caption text-muted">
              超过 100% 触发降级：暂停解析类调用，训练与复盘不受影响。
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function EvalReport({ row }: { row: EvalRunRow }) {
  return (
    <div className="mt-md rounded-md border border-border bg-surface p-md">
      <div className="flex items-center justify-between gap-sm">
        <span className="text-label-md text-muted">
          {new Date(row.at).toLocaleString("zh-CN")} · 通过率 {row.pass_rate}% · {row.run_by}
        </span>
        <Chip tone={row.gate_verdict === "通过" ? "insight" : "warning"}>门禁 {row.gate_verdict}</Chip>
      </div>
      {row.failures !== "[]" ? (
        <p className="mt-xs text-caption text-warning">失败：{row.failures.replace(/[[\]"]/g, "")}</p>
      ) : null}
    </div>
  );
}

function CaseResults({
  outcome,
}: {
  outcome: { results: Array<{ label: string; pass: boolean; detail: string }> };
}) {
  return (
    <ul className="mt-md space-y-xs">
      {outcome.results.map((r) => (
        <li key={r.label} className="flex items-start justify-between gap-sm rounded-sm bg-surface-soft p-md text-caption">
          <span className="text-body">
            {r.pass ? "✓" : "✗"} {r.label}
            <span className="ml-sm text-muted">{r.detail}</span>
          </span>
        </li>
      ))}
    </ul>
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
