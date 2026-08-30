"use client";

/**
 * Onboarding — §11.1 一屏一问，顶部 5 段进度（不是 17%），底部固定 Next CTA。
 * 覆盖：F0006 协议 / F0007 AI 说明 / F0015 考试类型 / F0016 批次地区 /
 * F0017 考试日期 / F0018 目标分数 / F0020 每日时间 / F0022 备考阶段 /
 * F0008/F0009 权限（可拒绝）/ F0012 可跳过导入。
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SegmentProgress } from "@/components/ui/Progress";
import { useProfileStore } from "@/lib/profile/store";
import type { ExamType, ModuleId, Stage } from "@/lib/profile/types";
import { MODULES } from "@/lib/profile/types";
import { duration } from "@/design/tokens";

const TOTAL_SEGMENTS = 5;

const EXAM_TYPES: ExamType[] = ["国考", "省考", "事业单位"];
const STAGES: Stage[] = ["零基础", "基础", "强化", "冲刺"];
const TIME_OPTIONS = [30, 60, 90, 120, 180, 240];

export default function OnboardingPage() {
  const router = useRouter();
  const { setAgreements, setGoal, setConditions } = useProfileStore();

  const [step, setStep] = useState(0);
  const [agreeUser, setAgreeUser] = useState(false);
  const [agreeAi, setAgreeAi] = useState(false);
  const [type, setType] = useState<ExamType | null>(null);
  const [examName, setExamName] = useState("");
  const [region, setRegion] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetTotal, setTargetTotal] = useState("");
  /** F0018 分模块目标（可选） */
  const [targetModules, setTargetModules] = useState<Record<string, string>>({});
  const [weekday, setWeekday] = useState<number | null>(null);
  const [weekend, setWeekend] = useState<number | null>(null);
  /** F0021 固定时段（可选） */
  const [timeWindows, setTimeWindows] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  /** F0024 薄弱自评（可选） */
  const [weakModules, setWeakModules] = useState<ModuleId[]>([]);

  const segment = useMemo(() => {
    if (step === 0) return 1;
    if (step >= 1 && step <= 2) return 2;
    if (step === 3) return 3;
    if (step >= 4 && step <= 5) return 4;
    return 5;
  }, [step]);

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return agreeUser && agreeAi;
      case 1:
        return type != null;
      case 2:
        return examName.trim() !== "" && region.trim() !== "";
      case 3:
        return examDate !== "";
      case 4:
        return targetTotal !== "" && Number(targetTotal) > 0;
      case 5:
        return weekday != null && weekend != null;
      case 6:
        return stage != null;
      default:
        return true;
    }
  };

  const next = (): void => {
    if (!canNext()) return;
    if (step === 6) {
      // 全部收集完成：写入 store，进入数据导入（可跳过）
      setAgreements({ userAgreement: agreeUser, aiBoundary: agreeAi });
      setGoal({
        type: type!,
        examName: examName.trim() || "批次待定",
        region: region.trim() || "地区待定",
        examDate: examDate || defaultExamDate(),
        targetTotal: Number(targetTotal) > 0 ? Number(targetTotal) : 105,
        targetModules: Object.fromEntries(
          Object.entries(targetModules)
            .filter(([, v]) => v !== "")
            .map(([k, v]) => [k, Number(v)]),
        ),
      });
      setConditions({
        weekdayMinutes: weekday ?? 60,
        weekendMinutes: weekend ?? 120,
        stage: stage ?? "基础",
        timeWindows: timeWindows.trim() || undefined,
        selfWeakModules: weakModules,
      });
    }
    setStep((s) => s + 1);
  };

  /** F0012 跳过非必要步骤：用占位值推进，稍后在「我的」补充 */
  const skip = (): void => {
    if (step >= 2 && step <= 6) {
      if (step === 3 && !examDate) setExamDate(defaultExamDate());
      if (step === 4 && targetTotal === "") setTargetTotal("105");
      if (step === 5 && weekday == null) {
        setWeekday(60);
        setWeekend(120);
      }
      if (step === 6 && stage == null) setStage("基础");
    }
    setStep((s) => s + 1);
  };

  function defaultExamDate(): string {
    const d = new Date(Date.now() + 90 * 86_400_000);
    return d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    if (step === 7) {
      router.replace("/import?from=onboarding");
    }
  }, [step, router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-lg pt-xl">
      <SegmentProgress total={TOTAL_SEGMENTS} current={segment} label="引导进度" />
      <div key={step} className="flex flex-1 flex-col justify-center">
        <StepBody
          step={step}
          fields={{
            agreeUser,
            setAgreeUser,
            agreeAi,
            setAgreeAi,
            type,
            setType,
            examName,
            setExamName,
            region,
            setRegion,
            examDate,
            setExamDate,
            targetTotal,
            setTargetTotal,
            targetModules,
            setTargetModules,
            weekday,
            setWeekday,
            weekend,
            setWeekend,
            timeWindows,
            setTimeWindows,
            weakModules,
            setWeakModules,
            stage,
            setStage,
          }}
        />
      </div>
      {step < 7 ? (
        <div className="sticky bottom-0 bg-canvas pt-md">
          {step === 0 ? (
            <p className="mb-sm text-center text-caption text-muted-soft">
              协议确认后才能开始使用；你可以随时在「我的-数据与隐私」中撤回。
            </p>
          ) : null}
          <Button fullWidth onClick={next} disabled={!canNext()}>
            {step === 6 ? "完成建档" : "下一步"}
          </Button>
          {/* F0012 跳过策略：第 3–7 屏可跳过（协议与考试类型必填） */}
          {step >= 2 && step <= 6 ? (
            <button
              type="button"
              onClick={skip}
              className="mt-sm w-full text-center text-caption text-muted underline-offset-2 hover:underline"
            >
              跳过这一步（先占位，稍后在「我的」补充）
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

interface Fields {
  agreeUser: boolean;
  setAgreeUser: (v: boolean) => void;
  agreeAi: boolean;
  setAgreeAi: (v: boolean) => void;
  type: ExamType | null;
  setType: (v: ExamType) => void;
  examName: string;
  setExamName: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  examDate: string;
  setExamDate: (v: string) => void;
  targetTotal: string;
  setTargetTotal: (v: string) => void;
  targetModules: Record<string, string>;
  setTargetModules: (v: Record<string, string>) => void;
  weekday: number | null;
  setWeekday: (v: number) => void;
  weekend: number | null;
  setWeekend: (v: number) => void;
  timeWindows: string;
  setTimeWindows: (v: string) => void;
  weakModules: ModuleId[];
  setWeakModules: (v: ModuleId[]) => void;
  stage: Stage | null;
  setStage: (v: Stage) => void;
}

function StepBody({ step, fields }: { step: number; fields: Fields }) {
  switch (step) {
    case 0:
      return (
        <section>
          <p className="text-micro text-primary">见岸</p>
          <h1 className="mt-sm text-display-app text-ink">
            看清你为什么
            <br />
            卡在这里。
          </h1>
          <p className="mt-lg text-body-md text-body">
            见岸根据你的真实训练持续校准，告诉你此刻最值得解决的问题。它不是题库，也不承诺押题。
          </p>
          {/* F0011 使用方式：一条闭环讲清楚 */}
          <div className="mt-lg flex items-center gap-xs text-caption text-muted" aria-label="使用闭环">
            <span className="rounded-full bg-surface-soft px-sm py-xxs">诊断</span>→
            <span className="rounded-full bg-surface-soft px-sm py-xxs">处方</span>→
            <span className="rounded-full bg-surface-soft px-sm py-xxs">训练</span>→
            <span className="rounded-full bg-surface-soft px-sm py-xxs">复盘</span>→
            <span className="text-primary">更准的诊断</span>
          </div>
          <ConsentRow
            checked={fields.agreeUser}
            onChange={fields.setAgreeUser}
            label="我已阅读并同意《用户协议》与《隐私政策》"
          />
          <ConsentRow
            checked={fields.agreeAi}
            onChange={fields.setAgreeAi}
            label="我了解 AI 建议存在能力边界，不构成官方评分或上岸承诺"
          />
        </section>
      );
    case 1:
      return (
        <Question title="你的目标考试是？" hint="先从最能回答的事实开始">
          <div className="mt-xl space-y-md">
            {EXAM_TYPES.map((t) => (
              <OptionRow
                key={t}
                label={t}
                selected={fields.type === t}
                onClick={() => fields.setType(t)}
              />
            ))}
          </div>
        </Question>
      );
    case 2:
      return (
        <Question title="报考哪一批次、哪个地区？" hint="例如「2026 年国考 · 广东」">
          <div className="mt-xl space-y-lg">
            <Field label="考试批次" value={fields.examName} onChange={fields.setExamName} placeholder="如 2026 年国考" />
            <Field label="目标地区" value={fields.region} onChange={fields.setRegion} placeholder="如 广东省" />
          </div>
        </Question>
      );
    case 3:
      return (
        <Question title="考试日期是哪天？" hint="用于倒推复习节奏；之后可以修改">
          <div className="mt-xl">
            <input
              type="date"
              value={fields.examDate}
              onChange={(e) => fields.setExamDate(e.target.value)}
              aria-label="考试日期"
              className="h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md text-ink"
            />
          </div>
        </Question>
      );
    case 4:
      return (
        <Question title="目标总分是多少？" hint="行测+申论合计，满分以你报考批次为准">
          <div className="mt-xl">
            <Field
              label="目标总分"
              value={fields.targetTotal}
              onChange={(v) => fields.setTargetTotal(v.replace(/[^\d]/g, ""))}
              placeholder="如 140"
              inputMode="numeric"
            />
            {/* F0018 分模块目标（可选） */}
            <details className="mt-lg">
              <summary className="cursor-pointer text-body-sm text-primary">
                分模块目标（可选，不填则按平均折算）
              </summary>
              <div className="mt-md space-y-md">
                {MODULES.map((m) => (
                  <Field
                    key={m}
                    label={`${m} 目标分`}
                    value={fields.targetModules[m] ?? ""}
                    onChange={(v) =>
                      fields.setTargetModules({ ...fields.targetModules, [m]: v.replace(/[^\d]/g, "") })
                    }
                    inputMode="numeric"
                  />
                ))}
              </div>
            </details>
          </div>
        </Question>
      );
    case 5:
      return (
        <Question title="每天能投入多少时间？" hint="处方会按这个预算安排任务量">
          <div className="mt-xl space-y-lg">
            <TimePick label="工作日" value={fields.weekday} onChange={fields.setWeekday} />
            <TimePick label="周末" value={fields.weekend} onChange={fields.setWeekend} />
            {/* F0021 固定时段（可选） */}
            <Field
              label="固定可学习时段（可选）"
              value={fields.timeWindows}
              onChange={fields.setTimeWindows}
              placeholder="如 工作日 20:00–22:30"
            />
          </div>
        </Question>
      );
    case 6:
      return (
        <Question title="你现在的备考阶段？" hint="凭感觉选即可，后续会用真实数据校准">
          <div className="mt-xl space-y-md">
            {STAGES.map((s) => (
              <OptionRow
                key={s}
                label={s}
                selected={fields.stage === s}
                onClick={() => fields.setStage(s)}
              />
            ))}
          </div>
          {/* F0024 薄弱自评（可选，多选） */}
          <div className="mt-xl">
            <p className="text-label-md text-muted">觉得自己弱的模块（可选，多选）</p>
            <div className="mt-sm flex flex-wrap gap-sm" role="group" aria-label="自评薄弱模块">
              {MODULES.map((m) => {
                const on = fields.weakModules.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      fields.setWeakModules(on ? fields.weakModules.filter((x) => x !== m) : [...fields.weakModules, m])
                    }
                    className={`rounded-full border px-md py-sm text-label-md ${
                      on ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p className="mt-sm text-caption text-muted-soft">
              自评只作参考；系统会以真实训练数据校准，不会替你下结论。
            </p>
          </div>
        </Question>
      );
    default:
      return null;
  }
}

function Question({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-headline-xl text-ink">{title}</h1>
      <p className="mt-sm text-body-sm text-muted">{hint}</p>
      {children}
    </section>
  );
}

function ConsentRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-lg flex items-start gap-md rounded-md border border-border bg-surface p-md text-body-sm text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-4 w-4 accent-[var(--ja-color-primary)]"
      />
      <span>{label}</span>
    </label>
  );
}

function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-12 w-full rounded-sm border text-left px-lg text-button-md transition-colors ${
        selected
          ? "border-primary bg-primary-faint text-primary-active"
          : "border-border-strong bg-surface text-ink"
      }`}
      style={{ transitionDuration: `${duration.fast}ms` }}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="text-label-md text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-xs h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function TimePick({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-label-md text-muted">{label}</p>
      <div className="mt-xs flex flex-wrap gap-sm">
        {TIME_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={value === m}
            onClick={() => onChange(m)}
            className={`rounded-full border px-md py-sm text-label-md ${
              value === m ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {m} 分钟
          </button>
        ))}
      </div>
    </div>
  );
}
