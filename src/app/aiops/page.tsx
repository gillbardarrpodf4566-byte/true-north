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
  ["monitor", "监控"],
  ["budget", "预算"],
] as const;

interface PromptVersion {
  v: string;
  status: "草稿" | "已发布" | "已回滚";
  note: string;
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
  const [running, setRunning] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{
    suite: string;
    passRate: number;
    failures: string[];
    gateVerdict: string;
    results: Array<{ label: string; pass: boolean; detail: string }>;
  } | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("eval");

  const load = useCallback(async (): Promise<void> => {
    const d = await adminApi<AioConfig & { evalRuns: EvalRunRow[] }>("/api/admin/aiops/config");
    if (d.ok) {
      setConfig({
        routing: d.routing ?? { parse: "mock-parse-v1", diagnose: "mock-diag-v1", coach: "mock-coach-v1" },
        daily_budget: Number(d.daily_budget ?? 500000),
        prompt_versions: d.prompt_versions ?? [],
        schema_versions: d.schema_versions ?? [],
      });
      setEvalRuns(d.evalRuns ?? []);
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
    async (suite: "parser" | "diagnosis"): Promise<void> => {
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
