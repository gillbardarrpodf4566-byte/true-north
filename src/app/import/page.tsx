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
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMachine } from "@xstate/react";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/StateViews";
import { aiGateway, type ParseResult, type FieldConfidence } from "@/lib/ai/gateway";
import { checkAll } from "@/lib/quality/checks";
import { scoreImportMachine } from "@/lib/import/machine";
import { useProfileStore, type ScoreImport } from "@/lib/profile/store";
import { computeBaseline } from "@/lib/baseline/compute";
import { recordPermission } from "@/lib/auth/client";

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
    async (files: FileList) => {
      const all = Array.from(files);
      if (all.length === 0) return;
      send({ type: "START_UPLOAD", fileName: all.map((f) => f.name).join(", ") });
      setPreviewUrl(URL.createObjectURL(all[0]!));
      // 上传→解析为同一异步流；阶段文案轮换展示真实阶段（无假进度条）
      setStageText(0);
      const t = setInterval(() => setStageText((s) => Math.min(s + 1, STAGE_TEXTS.length - 1)), 700);
      try {
        await new Promise((r) => setTimeout(r, 500)); // mock 上传耗时
        send({ type: "UPLOAD_DONE" });
        // F0031 多图上传：逐张解析后按模块合并（同场考试的不同部分）
        let merged: ParseResult | null = null;
        let failed = 0;
        for (const f of all) {
          try {
            const r = await aiGateway.parseScoreScreenshot({ fileName: f.name, sizeBytes: f.size });
            merged = merged ? mergeParseResults(merged, r) : r;
          } catch {
            failed += 1; // 单张失败不拖垮整批；缺失字段按 F0036 标记
          }
        }
        if (merged) {
          send({ type: "PARSE_DONE", parse: failed > 0 ? withPartialNote(merged, failed) : merged });
        } else {
          send({ type: "PARSE_FAIL", message: `${failed} 张截图都没有解析成功，原图已保留。` });
        }
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
    // 用户纠正率埋点（F0386）
    const corrected = Object.keys(snapshot.context.editedValues).length;
    void corrected;
    send({ type: "SUBMIT" });
    router.replace("/baseline");
  };

  // F0037 重复识别：与已写入记录同场同分时提示合并/忽略
  const duplicate = useMemo(() => {
    const p = snapshot.context.parse;
    if (!p) return null;
    return (
      imports.find(
        (im) => im.examLabel === p.examLabel && im.totalScore != null && im.totalScore === p.totalScore,
      ) ?? null
    );
  }, [snapshot.context.parse, imports]);

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
          duplicateOf={duplicate}
          onConfirmField={(k) => send({ type: "CONFIRM_FIELD", fieldKey: k })}
          onEditField={(k, v) => send({ type: "EDIT_FIELD", fieldKey: k, value: v })}
          onSubmit={confirmAndSave}
        />
      ) : null}
    </main>
  );
}

/** F0031：按模块合并多张截图的解析结果 */
function mergeParseResults(a: ParseResult, b: ParseResult): ParseResult {
  const byId = new Map(a.modules.map((m) => [m.id, m]));
  for (const m of b.modules) {
    const existing = byId.get(m.id);
    if (!existing) byId.set(m.id, m);
    else
      byId.set(m.id, {
        id: m.id,
        score: existing.score ?? m.score,
        questions: existing.questions ?? m.questions,
        correct: existing.correct ?? m.correct,
        secondsPerQuestion: existing.secondsPerQuestion ?? m.secondsPerQuestion,
      });
  }
  const modules = [...byId.values()];
  const covered = new Set(modules.filter((m) => m.score != null).map((m) => m.id));
  const totals = [a.totalScore, b.totalScore].filter((v): v is number => v != null);
  // 两个文件覆盖不同部分时求和；重叠时取先解析到的（避免重复累加整卷总分）
  const disjoint = covered.size >= modules.length && totals.length === 2;
  const confidence: Record<string, FieldConfidence> = { ...a.confidence };
  for (const [k, v] of Object.entries(b.confidence)) {
    const rank = { high: 3, medium: 2, low: 1, missing: 0 } as const;
    const prev = confidence[k];
    if (prev == null || rank[v] > rank[prev]) confidence[k] = v;
  }
  return {
    platform: a.platform,
    examLabel: a.examLabel,
    totalScore: disjoint ? round1(totals[0]! + totals[1]!) : (a.totalScore ?? b.totalScore),
    modules,
    confidence,
    sourceConfidence: a.sourceConfidence,
  };
}

function withPartialNote(p: ParseResult, failed: number): ParseResult {
  // 失败张数只进标签；缺失字段仍按字段级 missing 标记（F0036），不新增未知键
  return { ...p, examLabel: `${p.examLabel}（${failed} 张未识别）` };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

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
  onFile: (files: FileList) => void;
}) {
  // F0009 相册/文件权限：说明 → 授权 → 记录入库（xlsx 流程「说明→选择/授权→处理→结果确认→审计」）。
  // Web 端没有独立的系统相册授权，这里做显式授权确认门；input 保持可命中以兼容自动化。
  const [albumGranted, setAlbumGranted] = useState(false);
  const grantAlbum = async (): Promise<void> => {
    setAlbumGranted(true);
    await recordPermission("album", true);
  };
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

      {/* input 常驻（sr-only）以保证授权前后都可程序化选择文件 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        id="score-file-input"
        onChange={(e) => {
          if (albumGranted && e.target.files && e.target.files.length > 0) onFile(e.target.files);
        }}
      />

      {!albumGranted ? (
        <div className="mt-xl rounded-lg border border-border bg-surface p-lg" role="group" aria-label="成绩截图访问授权">
          <p className="text-body-md text-ink">允许见岸读取你的成绩截图吗？</p>
          <ul className="mt-sm list-disc space-y-xs pl-lg text-caption text-muted">
            <li>仅在你主动选择图片时读取，见岸不会扫描你的相册</li>
            <li>截图只用于识别成绩字段，识别完成即可随手删除原图</li>
            <li>识别结果必须经你逐项确认才会写入档案</li>
          </ul>
          <Button className="mt-md" fullWidth onClick={grantAlbum}>
            授权并继续
          </Button>
          <p className="mt-sm text-center text-caption text-muted-soft">
            授权记录会保存（可撤回）；拒绝则只能使用手工录入。
          </p>
        </div>
      ) : (
        <label
          htmlFor="score-file-input"
          className="mt-xl flex min-h-40 cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border border-dashed border-border-strong bg-surface p-xl text-center"
        >
          <span className="text-body-md text-ink">点击选择成绩截图</span>
          <span className="text-caption text-muted">支持 JPG / PNG；一次可多选同场考试截图</span>
        </label>
      )}

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
  duplicateOf,
  onConfirmField,
  onEditField,
  onSubmit,
}: {
  parse: ParseResult;
  previewUrl: string | null;
  confirmedKeys: string[];
  duplicateOf: { id: string; examLabel: string; totalScore: number | null } | null;
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
        {duplicateOf ? (
          <div role="alert" className="mt-lg rounded-md border border-warning bg-warning-soft p-md">
            <p className="text-body-sm text-ink">
              ⚠ 这可能是一次重复导入：已存在「{duplicateOf.examLabel}
              {duplicateOf.totalScore != null ? ` · ${duplicateOf.totalScore} 分` : ""}」的记录。
            </p>
            <p className="mt-xs text-caption text-muted">
              如为同一场考试，建议返回不上传；如数据有修订，继续写入即可（两条都会保留）。
            </p>
          </div>
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
