"use client";

/**
 * 外部数据中心（V1）：历史模考 / 练习结果 / 错题批量导入（F0039/F0042/F0043），
 * 用时抽取（F0044），原始证据-解析版本绑定（F0048），纠正可进入评测池（F0049）。
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfileStore } from "@/lib/profile/store";
import { getToken } from "@/lib/auth/client";
import { computeBaseline } from "@/lib/baseline/compute";
import { parseHistoryJson, parsePracticeJson, parseWrongJson, extractTiming, stableDigest, wrongFingerprint } from "@/lib/import/advanced";
import type { ExternalPracticeRecord } from "@/lib/import/advanced";

type Mode = "history" | "practice" | "wrong";

const EXAMPLES: Record<Mode, string> = {
  history: JSON.stringify([{ date: "2026-08-20", examLabel: "粉笔模考·第3套", totalScore: 122, modules: [{ id: "资料分析", score: 16, questions: 20, correct: 16, secondsPerQuestion: 95 }] }], null, 2),
  practice: JSON.stringify([{ date: "2026-08-20", moduleId: "资料分析", questionType: "图表型资料", questions: 20, correct: 16, totalSeconds: 1800 }], null, 2),
  wrong: JSON.stringify([{ date: "2026-08-20", moduleId: "资料分析", questionText: "某市2024年……", userAnswer: "A", correctAnswer: "C" }], null, 2),
};

export default function AdvancedImportPage() {
  const router = useRouter();
  const { addImport, imports, setBaseline, addWrongEntries } = useProfileStore();
  const [mode, setMode] = useState<Mode>("history");
  const [text, setText] = useState(EXAMPLES.history);
  const [source, setSource] = useState("粉笔导出");
  const [report, setReport] = useState<{ ok: boolean; message: string; details?: string[] } | null>(null);

  const placeholder = useMemo(() => EXAMPLES[mode], [mode]);
  const changeMode = (next: Mode): void => {
    setMode(next);
    setText(EXAMPLES[next]);
    setReport(null);
  };

  /** 登录账号由服务端导入台账判重；访客只在隔离的本地 guest 空间按稳定 ID 去重。 */
  const claimServerBatch = async (kind: Mode, records: unknown[], parserVersion: string): Promise<boolean> => {
    const token = getToken();
    if (!token) return true;
    const response = await fetch("/api/imports/external", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, sourceLabel: source, parserVersion, records }),
    });
    const data = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; status?: "created" | "already_imported"; message?: string };
    if (!data.ok) {
      setReport({ ok: false, message: data.message ?? "无法确认导入是否重复，请稍后重试。" });
      return false;
    }
    if (data.status === "already_imported") {
      setReport({ ok: true, message: "相同外部数据已同步过，未重复计入基线或错题本。" });
      return false;
    }
    return true;
  };

  const importData = async (): Promise<void> => {
    if (mode === "history") {
      const parsed = parseHistoryJson(text, source);
      if (parsed.issues.length > 0) {
        setReport({ ok: false, message: `校验失败 ${parsed.issues.length} 处`, details: parsed.issues.map((i) => `第${i.row}行 ${i.field}：${i.message}`) });
        return;
      }
      if (!(await claimServerBatch("history", parsed.records, "external-history-v1"))) return;
      for (const r of parsed.records) addImport(r);
      const importedIds = new Set(parsed.records.map((record) => record.id));
      setBaseline(computeBaseline([...imports.filter((record) => !importedIds.has(record.id)), ...parsed.records]));
      setReport({ ok: true, message: `已导入 ${parsed.records.length} 场历史模考；原始证据已与解析版本绑定。` });
    } else if (mode === "practice") {
      const parsed = parsePracticeJson(text, source);
      if (parsed.issues.length > 0) {
        setReport({ ok: false, message: `校验失败 ${parsed.issues.length} 处`, details: parsed.issues.map((i) => `第${i.row}行 ${i.field}：${i.message}`) });
        return;
      }
      if (!(await claimServerBatch("practice", parsed.records, "external-practice-v1"))) return;
      const timing = extractTiming(parsed.records);
      // 练习结果转换为系统训练记录；不丢 rawEvidence
      const byModule = new Map<string, ExternalPracticeRecord[]>();
      for (const r of parsed.records) byModule.set(r.moduleId, [...(byModule.get(r.moduleId) ?? []), r]);
      for (const [moduleId, list] of byModule) {
        const questions = list.reduce((s, r) => s + r.questions, 0);
        const correct = list.reduce((s, r) => s + r.correct, 0);
        const batchFingerprint = stableDigest({
          kind: "practice-batch",
          source,
          records: list.map((item) => ({ date: item.date, moduleId: item.moduleId, questionType: item.questionType, questions: item.questions, correct: item.correct, totalSeconds: item.totalSeconds })),
        });
        addImport({
          id: `external-practice-${batchFingerprint}`,

          source: "系统训练",
          platform: source,
          examLabel: `外部练习·${moduleId}`,
          importedAt: list[0]!.date,
          totalScore: null,
          sourceRef: { kind: "external", rawEvidence: list.map((r) => r.rawEvidence).join("\n"), parserVersion: "external-practice-v1" },
          modules: [{ id: moduleId as never, score: null, questions, correct, secondsPerQuestion: Math.round((timing.perType[list[0]!.questionType] ?? 0)) }],
        });
      }
      setReport({ ok: true, message: `已导入 ${parsed.records.length} 条练习记录；总用时 ${timing.totalSeconds} 秒。` });
    } else {
      const parsed = parseWrongJson(text, source);
      if (parsed.issues.length > 0) {
        setReport({ ok: false, message: `校验失败 ${parsed.issues.length} 处`, details: parsed.issues.map((i) => `第${i.row}行 ${i.field}：${i.message}`) });
        return;
      }
      if (!(await claimServerBatch("wrong", parsed.records, "external-wrong-v1"))) return;
      addWrongEntries(parsed.records.map((r) => ({
        questionId: `external-${wrongFingerprint(r, source)}`,
        moduleId: r.moduleId,
        addedAt: r.date,
        status: "待确认" as const,
        suggested: { cause: null, confidence: "低" as const, evidence: `外部错题「${r.questionText.slice(0, 30)}…」未提供足够轨迹，暂不推断错因。`, needsUserConfirm: true },
        confirmedCause: null,
        retestLog: [],
      })));
      setReport({ ok: true, message: `已导入 ${parsed.records.length} 条错题；错因保持未知，等待你确认。` });
    }
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header>
        <h1 className="text-headline-xl text-ink">外部数据中心</h1>
        <p className="mt-xs text-body-sm text-muted">先提取，再校验；无法确定的字段保持缺失，不替你猜。</p>
      </header>
      <div className="mt-lg flex flex-wrap gap-sm" role="tablist" aria-label="导入类型">
        {(["history", "practice", "wrong"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => changeMode(m)} className={`rounded-full border px-md py-sm text-label-md ${mode === m ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"}`}>
            {m === "history" ? "历史模考（F0039）" : m === "practice" ? "练习结果（F0042/F0044）" : "外部错题（F0043）"}
          </button>
        ))}
      </div>
      <Card className="mt-lg">
        <label className="block">
          <span className="text-label-md text-muted">来源标签</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} aria-label="来源标签" className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" />
        </label>
        <label className="mt-lg block">
          <span className="text-label-md text-muted">JSON（示例可编辑）</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="导入 JSON" rows={12} className="mt-xs w-full rounded-sm border border-border-strong bg-surface p-md font-mono text-caption text-ink" />
        </label>
        <div className="mt-sm flex items-center justify-between">
          <button type="button" onClick={() => setText(placeholder)} className="text-caption text-primary">恢复示例</button>
          <Button onClick={() => void importData()}>校验并导入</Button>
        </div>
        {report ? (
          <div role={report.ok ? "status" : "alert"} className={`mt-lg rounded-md border p-md ${report.ok ? "border-success-soft bg-success-soft" : "border-warning bg-warning-soft"}`}>
            <p className="text-body-sm text-body">{report.ok ? "✓ " : "⚠ "}{report.message}</p>
            {report.details ? <ul className="mt-sm list-disc pl-lg text-caption text-muted">{report.details.map((d) => <li key={d}>{d}</li>)}</ul> : null}
          </div>
        ) : null}
      </Card>
      <Card className="mt-lg">
        <p className="text-label-md text-muted">数据边界</p>
        <ul className="mt-sm list-disc space-y-xs pl-lg text-body-sm text-body">
          <li>原始证据只用于追溯，解析结果经你确认后才影响诊断。</li>
          <li>外部错题没有作答轨迹时，错因保持「待确认」，不会默认归因「粗心」。</li>
          <li>导入后的纠正可进入 AI 评测候选集（F0049）。</li>
        </ul>
      </Card>
      <Button variant="tertiary" className="mt-lg" onClick={() => router.push("/import")}>返回成绩导入</Button>
    </main>
  );
}
