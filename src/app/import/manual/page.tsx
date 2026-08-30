"use client";

/** 手工录入成绩（F0038 P1）：无截图时的等价入口，写入同一档案与基线管线。 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useProfileStore, type ScoreImport } from "@/lib/profile/store";
import { computeBaseline } from "@/lib/baseline/compute";
import { MODULES, MODULE_FULL_SCORE } from "@/lib/profile/types";

export default function ManualImportPage() {
  const router = useRouter();
  const { addImport, setBaseline, imports } = useProfileStore();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    const filled = MODULES.filter((m) => scores[m] != null && scores[m] !== "");
    if (filled.length === 0) {
      setError("至少填写一个模块的得分。");
      return;
    }
    const bad = filled.find((m) => {
      const v = Number(scores[m]);
      return Number.isNaN(v) || v < 0 || v > MODULE_FULL_SCORE[m];
    });
    if (bad) {
      setError(`${bad} 的得分超出 0–${MODULE_FULL_SCORE[bad]}，请核对。`);
      return;
    }
    const imp: ScoreImport = {
      id: `imp-${Date.now()}`,
      source: "手工录入",
      platform: "手工",
      examLabel: "手工录入成绩",
      importedAt: new Date().toISOString(),
      totalScore: null,
      modules: MODULES.map((id) => ({
        id,
        score: scores[id] ? Number(scores[id]) : null,
        questions: null,
        correct: null,
        secondsPerQuestion: null,
      })),
    };
    addImport(imp);
    setBaseline(computeBaseline([...imports, imp]));
    router.replace("/baseline");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">手工录入成绩</h1>
      <p className="mt-xs text-body-sm text-muted">按最近一次模考的模块得分填写；不确定的模块可以留空。</p>

      <div className="mt-xl space-y-md">
        {MODULES.map((m) => (
          <label key={m} className="flex items-center justify-between gap-md rounded-md border border-border bg-surface p-md">
            <span className="text-body-md text-ink">
              {m}
              <span className="ml-xs text-caption text-muted">满分 {MODULE_FULL_SCORE[m]}</span>
            </span>
            <input
              inputMode="decimal"
              value={scores[m] ?? ""}
              onChange={(e) => setScores((s) => ({ ...s, [m]: e.target.value.replace(/[^\d.]/g, "") }))}
              aria-label={`${m}得分`}
              className="h-10 w-24 rounded-sm border border-border-strong px-sm text-right text-body-md text-ink"
            />
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-lg text-body-sm text-error">
          {error}
        </p>
      ) : null}

      <Button className="mt-xl" fullWidth onClick={submit}>
        写入档案
      </Button>
    </main>
  );
}
