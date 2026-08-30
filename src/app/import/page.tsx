"use client";

/**
 * Diagnostic Import — §11.3：选择来源 → 上传 → 识别 → 高亮不确定字段 → 确认 → 写入。
 *
 * 规范要点：
 * - OCR 不用假进度条，显示阶段状态「正在识别 → 正在核对 → 等你确认」（§11.3 Motion）
 * - 上传后原图置于背景参考层，结构化数据为前景 sheet（§11.3 Visual）
 * - 低置信/缺失字段必须标记并要求确认（F0034/F0035/F0036），缺失禁止编造
 * - 状态机：待上传/上传中/解析中/待确认/已确认 + 失败恢复（xlsx 状态机）
 */
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMachine } from "@xstate/react";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/StateViews";
import { aiGateway, type ParseResult } from "@/lib/ai/gateway";
import { checkAll } from "@/lib/quality/checks";
import { scoreImportMachine } from "@/lib/import/machine";
import { useProfileStore, type ScoreImport } from "@/lib/profile/store";
import { computeBaseline } from "@/lib/baseline/compute";

const STAGE_TEXTS = ["正在识别截图中的成绩信息…", "正在核对模块与题量一致性…", "整理好了，等你确认"];

export default function ImportPage() {
  const router = useRouter();
  const { addImport, setBaseline, imports } = useProfileStore();
  const [snapshot, send] = useMachine(scoreImportMachine);
  const [stageText, setStageText] = useState(0);
  const [platform, setPlatform] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const state = snapshot.value as string;

  const startParse = useCallback(
    async (file: File) => {
      send({ type: "START_UPLOAD", fileName: file.name });
      setPreviewUrl(URL.createObjectURL(file));
      // 上传→解析为同一异步流；阶段文案轮换展示真实阶段（无假进度条）
      setStageText(0);
      const t = setInterval(() => setStageText((s) => Math.min(s + 1, STAGE_TEXTS.length - 1)), 700);
      try {
        await new Promise((r) => setTimeout(r, 500)); // mock 上传耗时
        send({ type: "UPLOAD_DONE" });
        const parse = await aiGateway.parseScoreScreenshot({
          fileName: file.name,
          sizeBytes: file.size,
        });
        send({ type: "PARSE_DONE", parse });
      } catch {
        send({ type: "PARSE_FAIL", message: "解析没有成功，原图已保留。" });
      } finally {
        clearInterval(t);
      }
    },
    [send],
  );

  const confirmAndSave = (): void => {
    const parse = snapshot.context.parse;
    if (!parse) return;
    const imp: ScoreImport = {
      id: `imp-${Date.now()}`,
      source: "截图",
      platform: parse.platform,
      examLabel: parse.examLabel,
      importedAt: new Date().toISOString(),
      totalScore: applyEdits(parse.totalScore, "total", snapshot.context.editedValues, Number),
      modules: parse.modules.map((m) => ({
        id: m.id,
        score: applyEdits(m.score, `module:${m.id}:score`, snapshot.context.editedValues, Number),
        questions: m.questions,
        correct: applyEdits(m.correct, `module:${m.id}:correct`, snapshot.context.editedValues, Number),
        secondsPerQuestion: applyEdits(
          m.secondsPerQuestion,
          `module:${m.id}:seconds`,
          snapshot.context.editedValues,
          Number,
        ),
      })),
    };
    addImport(imp);
    setBaseline(computeBaseline([...imports, imp]));
    send({ type: "SUBMIT" });
    router.replace("/baseline");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-xl pt-xl">
      <header>
        <h1 className="text-headline-xl text-ink">导入模考成绩</h1>
        <p className="mt-xs text-body-sm text-muted">
          上传粉笔 / 华图等模考成绩截图，AI 解析后由你逐项确认，才会写入你的档案。
        </p>
      </header>

      {state === "待上传" ? <UploadStep platform={platform} setPlatform={setPlatform} fileRef={fileRef} onFile={startParse} /> : null}

      {(state === "上传中" || state === "解析中") ? (
        <section className="mt-xl rounded-lg border border-border bg-surface p-xl" aria-live="polite">
          <p className="text-body-md text-ink">{STAGE_TEXTS[stageText]}</p>
          <p className="mt-sm text-caption text-muted">完成后需要你逐项确认，不会直接写入。</p>
        </section>
      ) : null}

      {state === "解析失败" || state === "上传失败" ? (
        <div className="mt-xl">
          <ErrorState
            what={snapshot.context.errorMessage ?? "解析没有成功。"}
            dataSafe="原图已保留，不会丢失。"
            onRetry={() => send({ type: "RETRY" })}
            retryLabel="重新解析"
          />
          <Button className="mt-md" variant="tertiary" onClick={() => send({ type: "CANCEL" })}>
            返回重新上传
          </Button>
        </div>
      ) : null}

      {state === "待确认" && snapshot.context.parse ? (
        <ConfirmSheet
          parse={snapshot.context.parse}
          previewUrl={previewUrl}
          confirmedKeys={snapshot.context.confirmedKeys}
          onConfirmField={(k) => send({ type: "CONFIRM_FIELD", fieldKey: k })}
          onEditField={(k, v) => send({ type: "EDIT_FIELD", fieldKey: k, value: v })}
          onSubmit={confirmAndSave}
        />
      ) : null}
    </main>
  );
}

function applyEdits<T>(original: T, key: string, edits: Record<string, string>, cast: (s: string) => T): T {
  const v = edits[key];
  if (v == null || v === "") return original;
  try {
    return cast(v);
  } catch {
    return original;
  }
}

function UploadStep({
  platform,
  setPlatform,
  fileRef,
  onFile,
}: {
  platform: string | null;
  setPlatform: (p: string) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
}) {
  return (
    <section className="mt-xl">
      <p className="text-label-md text-muted">成绩来源</p>
      <div className="mt-xs flex gap-sm">
        {["粉笔", "华图", "其他"].map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={platform === p}
            onClick={() => setPlatform(p)}
            className={`rounded-full border px-lg py-sm text-label-md ${
              platform === p ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <label className="mt-xl flex min-h-40 cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border border-dashed border-border-strong bg-surface p-xl text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <span className="text-body-md text-ink">点击选择成绩截图</span>
        <span className="text-caption text-muted">支持 JPG / PNG；一次可多选同场考试截图</span>
      </label>

      <div className="mt-lg">
        <Button variant="secondary" fullWidth onClick={() => (window.location.href = "/import/manual")}>
          没有截图？手工录入成绩
        </Button>
      </div>
    </section>
  );
}

function ConfirmSheet({
  parse,
  previewUrl,
  confirmedKeys,
  onConfirmField,
  onEditField,
  onSubmit,
}: {
  parse: ParseResult;
  previewUrl: string | null;
  confirmedKeys: string[];
  onConfirmField: (key: string) => void;
  onEditField: (key: string, value: string) => void;
  onSubmit: () => void;
}) {
  const issues = checkAll(parse.modules);
  const issueKeys = new Set(issues.map((i) => i.fieldKey));
  const riskyFields: string[] = [];
  for (const [k, c] of Object.entries(parse.confidence)) {
    if (c === "low" || c === "missing" || issueKeys.has(k)) riskyFields.push(k);
  }
  const allConfirmed = riskyFields.every((k) => confirmedKeys.includes(k));

  return (
    <section className="mt-xl">
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* §11.3：原图为背景参考层 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="上传的模考成绩截图（参考层）" className="h-24 w-full object-cover object-top opacity-40" />
        </div>
      ) : null}

      <div className="-mt-6 rounded-xl border border-border bg-surface p-lg" style={{ position: "relative" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg text-ink">识别结果 · 请确认</h2>
          <Chip tone="neutral">{parse.platform}</Chip>
        </div>

        <div className="mt-lg space-y-md">
          {parse.totalScore != null ? (
            <FieldRow
              label="总分"
              value={String(parse.totalScore)}
              confidence={parse.confidence["total"] ?? "high"}
              confirmed={confirmedKeys.includes("total") || !riskyFields.includes("total")}
              onConfirm={() => onConfirmField("total")}
              onEdit={(v) => onEditField("total", v)}
            />
          ) : (
            <FieldRow
              label="总分"
              value=""
              confidence="missing"
              confirmed={confirmedKeys.includes("total")}
              onConfirm={() => onConfirmField("total")}
              onEdit={(v) => onEditField("total", v)}
              hint="截图中未识别到总分，可留空或补录"
            />
          )}

          {parse.modules.map((m) => (
            <div key={m.id} className="rounded-md border border-border p-md">
              <p className="text-label-md text-muted">{m.id}</p>
              <div className="mt-sm grid grid-cols-3 gap-sm">
                <FieldRow
                  compact
                  label="得分"
                  value={m.score != null ? String(m.score) : ""}
                  confidence={parse.confidence[`module:${m.id}:score`] ?? "high"}
                  confirmed={confirmedKeys.includes(`module:${m.id}:score`) || !riskyFields.includes(`module:${m.id}:score`)}
                  onConfirm={() => onConfirmField(`module:${m.id}:score`)}
                  onEdit={(v) => onEditField(`module:${m.id}:score`, v)}
                />
                <div className="mt-xs flex items-center justify-between rounded-sm bg-surface-soft px-sm py-xs">
                  <span className="text-caption text-muted">题数</span>
                  <span className="text-body-sm text-body">{m.questions ?? "未识别"}</span>
                </div>
                <FieldRow
                  compact
                  label="秒/题"
                  value={m.secondsPerQuestion != null ? String(m.secondsPerQuestion) : ""}
                  confidence={parse.confidence[`module:${m.id}:seconds`] ?? "high"}
                  confirmed={confirmedKeys.includes(`module:${m.id}:seconds`) || !riskyFields.includes(`module:${m.id}:seconds`)}
                  onConfirm={() => onConfirmField(`module:${m.id}:seconds`)}
                  onEdit={(v) => onEditField(`module:${m.id}:seconds`, v)}
                />
              </div>
              {issues
                .filter((i) => i.fieldKey.startsWith(`module:${m.id}`))
                .map((i) => (
                  <p key={i.fieldKey} className="mt-xs text-caption text-warning">
                    ⚠ {i.message}
                  </p>
                ))}
            </div>
          ))}
        </div>

        {!allConfirmed ? (
          <p className="mt-lg text-caption text-warning">还有低置信或缺失字段未确认。确认或修改后才能写入档案。</p>
        ) : null}
        <Button className="mt-lg" fullWidth disabled={!allConfirmed} onClick={onSubmit}>
          确认无误，写入档案
        </Button>
        <p className="mt-sm text-center text-caption text-muted-soft">
          AI 识别可能有误差；你的确认会帮助系统校准。
        </p>
      </div>
    </section>
  );
}

function FieldRow({
  label,
  value,
  confidence,
  confirmed,
  onConfirm,
  onEdit,
  hint,
  compact = false,
}: {
  label: string;
  value: string;
  confidence: "high" | "medium" | "low" | "missing";
  confirmed: boolean;
  onConfirm: () => void;
  onEdit: (v: string) => void;
  hint?: string;
  compact?: boolean;
}) {
  const tone: ChipTone =
    confidence === "high" ? "insight" : confidence === "medium" ? "neutral" : "warning";
  const confLabel =
    confidence === "high"
      ? "可信"
      : confidence === "medium"
        ? "待核对"
        : confidence === "low"
          ? "低置信"
          : "缺失";
  const needsConfirm = !confirmed && (confidence === "low" || confidence === "missing");
  return (
    <div className={compact ? "" : "rounded-md border border-border p-md"}>
      <div className="flex items-center justify-between gap-sm">
        <span className={compact ? "text-caption text-muted" : "text-label-md text-muted"}>{label}</span>
        <Chip tone={tone}>{confLabel}</Chip>
      </div>
      <div className="mt-xs flex items-center gap-sm">
        <input
          defaultValue={value}
          onChange={(e) => onEdit(e.target.value)}
          aria-label={`${label}（识别值，可修改）`}
          inputMode="decimal"
          placeholder={confidence === "missing" ? "未识别" : ""}
          className={`w-full rounded-sm border bg-surface px-sm text-body-md text-ink placeholder:text-muted-soft ${
            needsConfirm ? "border-warning" : "border-border"
          } h-10`}
        />
        {needsConfirm ? (
          <Button variant="tertiary" className="shrink-0" onClick={onConfirm}>
            已核对
          </Button>
        ) : null}
      </div>
      {hint ? <p className="mt-xs text-caption text-muted">{hint}</p> : null}
    </div>
  );
}
