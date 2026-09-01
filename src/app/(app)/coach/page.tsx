"use client";

/**
 * AI Coach — §11.8。非空白聊天页：顶部上下文（目标/今日焦点/最近变化）+
 * 3 个动态建议问题；结构化回复 = 结论 → 证据 → 建议 → 行动按钮（§7.11 低气泡化）。
 * F0166/F0167 先问后讲与分级提示；F0176 引用当前数据；F0177 不确定表达；
 * F0178/F0179/F0319 有帮助/没帮助 + 举报。
 *
 * MVP 用确定性回复引擎（MockCoachGateway）；真实 LLM 走 AiGateway 预留接口。
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useProfileStore } from "@/lib/profile/store";
import { computeAbilityDimensions } from "@/lib/ability/dimensions";
import { duration } from "@/design/tokens";

interface CoachReply {
  conclusion: string;
  evidence: string[];
  advice: string;
  actions: Array<{ label: string; href: string }>;
  /** F0177：证据不足时明确表达不确定 */
  uncertainty: string | null;
}

interface Turn {
  id: string;
  role: "user" | "coach";
  text?: string;
  reply?: CoachReply;
  context?: string;
}

function buildReply(q: string, data: CoachData): CoachReply {
  const t = q.toLowerCase();
  const tone = data.style === "直接" ? "直接说结论：" : data.style === "苏格拉底式" ? "先一起确认一个问题：" : "我先温和地帮你梳理一下：";

  if (t.includes("为什么") && (t.includes("慢") || t.includes("速度") || t.includes("提不上去"))) {
    const m = data.topOpportunity;
    if (m && m.kind === "速度") {
      return {
        conclusion: `${tone}你的${m.moduleId}更像是速度问题，而不是不会做。`,
        evidence: [
          `诊断依据：${m.headline}`,
          `样本：基于你最近 ${data.sampleNote}`,
        ],
        advice: "接下来的训练以限时为主：先保住正确率，再每次压缩 10% 用时。",
        actions: [
          { label: "查看证据", href: "/diagnosis" },
          { label: "生成专项训练", href: "/train" },
        ],
        uncertainty: null,
      };
    }
    if (m) {
      return {
        conclusion: `${tone}当前最值得解决的其实是${m.moduleId}的${m.kind}问题。`,
        evidence: [m.headline, `样本：基于你最近 ${data.sampleNote}`],
        advice: m.kind === "准确率" ? "做题型专项，先到 75% 再谈速度。" : "这块属于基础缺口，先用方法卡补概念。",
        actions: [
          { label: "查看证据", href: "/diagnosis" },
          { label: "调整今日处方", href: "/today" },
        ],
        uncertainty: data.provisional ? "目前只基于少量数据，这个判断先作为候选。" : null,
      };
    }
  }

  if (t.includes("压缩") || t.includes("分钟") || t.includes("时间")) {
    return {
      conclusion: `可以把今天的计划压缩到 ${Math.max(20, Math.round(data.budget * 0.5))} 分钟。`,
      evidence: ["只保留「必须」任务，推荐与可选项顺延。"],
      advice: "压缩后优先完成限时训练，错题复盘可以放到明天。",
      actions: [{ label: "去调整今日时间", href: "/today" }],
      uncertainty: null,
    };
  }

  if (t.includes("模考") || t.includes("下降") || t.includes("判断")) {
    return {
      conclusion: `${tone}单次回落不足以判断趋势改变，先验证再调整。`,
      evidence: [
        data.examCount >= 2
          ? `最近 ${data.examCount} 次模考都已计入基线，可以在进展页看逐场变化。`
          : "你目前只有 1 次模考记录，波动是否异常还无法判断。",
      ],
      advice: data.examCount >= 2 ? "看模块层：分数变化通常先出现在单一模块。" : "再做 1 次模考后再判断。",
      actions: [
        { label: "看趋势", href: "/progress" },
        { label: "开始模考", href: "/mock" },
      ],
      uncertainty: data.examCount < 3 ? "样本还太少，我不会现在下结论。" : null,
    };
  }

  return {
    conclusion: "我先确认一下你想解决的是哪类问题：",
    evidence: ["你可以在下面选择，或换一种问法（提到模块名/速度/计划/模考会更准）。"],
    advice: "涉及具体数据的问题，我会带上你的训练证据再回答。",
    actions: [
      { label: "看今日焦点", href: "/today" },
      { label: "生成相似练习", href: "/train/session/auto-混合" },
      { label: "看提分诊断", href: "/diagnosis" },
    ],
    uncertainty: "这个问题我还没有足够的上下文。",
  };
}

interface CoachData {
  topOpportunity: { moduleId: string; kind: string; headline: string } | null;
  sampleNote: string;
  provisional: boolean;
  budget: number;
  examCount: number;
  style: "直接" | "温和" | "苏格拉底式";
}

export default function CoachPage() {
  const { profile, diagnosis, baseline, prescription, imports, membership, aiFeedback, addAiFeedback, learningPreferences, attemptRecords, wrongBook, coachHistory, addCoachTurns, consumeAiQuota } =
    useProfileStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");

  const data: CoachData = {
    topOpportunity: diagnosis?.opportunities[0] ?? null,
    sampleNote: baseline?.dataNote ?? "暂无基线数据",
    provisional: diagnosis?.provisional ?? true,
    budget: prescription?.budgetMinutes ?? 60,
    examCount: imports.filter((im) => im.source !== "系统训练").length,
    style: learningPreferences.coachStyle,
  };

  const ability = useMemo(() => computeAbilityDimensions(attemptRecords), [attemptRecords]);
  const suggestions = useMemo(() => {
    const s = ["为什么我的资料分析速度提不上去？", "把今天计划压缩到 30 分钟。", "我连续两次模考都下降，先查什么？"];
    if (wrongBook.length > 0) s.push("根据我的错因，下一步先修什么？");
    return s;
  }, [wrongBook.length]);

  const ask = (q: string): void => {
    if (q.trim() === "") return;
    const reply = buildReply(q, data);
    const now = Date.now();
    setTurns((cur) => [
      ...cur,
      { id: `u-${now}`, role: "user", text: q },
      { id: `c-${now}`, role: "coach", reply, context: diagnosis?.headline ?? "" },
    ]);
    // F0174：同一学习上下文的最近对话持久化；仅保留用户问题和教练结论，避免无限存储。
    addCoachTurns([
      { id: `u-${now}`, role: "user", text: q, context: diagnosis?.headline ?? "", at: new Date().toISOString() },
      { id: `c-${now}`, role: "coach", text: reply.conclusion, context: diagnosis?.headline ?? "", at: new Date().toISOString() },
    ]);
    // F0313：一次教练问答消耗一次 AI 额度
    consumeAiQuota();
    setInput("");
  };

  const feedback = (target: string, helpful: boolean | null, reported = false): void => {
    addAiFeedback({ target, helpful, reported, reason: reported ? "解释与数据不符" : "" });
  };

  const hasFeedback = (target: string): boolean =>
    aiFeedback.some((f) => f.target === target);

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      {/* 上下文头（§11.8 Landing：不是空白聊天页） */}
      <Card tone="faint" radius="lg">
        <p className="text-micro text-primary">AI 教练</p>
        <p className="mt-xs text-body-sm text-body">
          {profile.goal
            ? `目标：${profile.goal.examName} · ${profile.goal.region}`
            : "目标：未设置"}
        </p>
        {diagnosis ? (
          <p className="mt-xs text-caption text-muted">当前焦点：{diagnosis.headline}</p>
        ) : (
          <p className="mt-xs text-caption text-muted">还没有你的诊断数据，先去建立基线。</p>
        )}
        {/* F0165：教练明确读取画像与历史弱点 */}
        <p className="mt-xs text-caption text-muted">
          画像上下文：已记录 {attemptRecords.length} 条作答轨迹 · 错题 {wrongBook.length} 题 ·
          稳定性 {ability.stability.level ?? "样本不足"}
        </p>
        {/* F0019/F0023/F0025：目标岗位与已有资源、练习偏好会进入教练建议的前提 */}
        <p className="mt-xxs text-caption text-muted">
          前提条件：{profile.goal?.targetJob ? `目标岗位「${profile.goal.targetJob}」 · ` : ""}
          {learningPreferences.resources.length > 0 ? `沿用你已有的 ${learningPreferences.resources.join("、")} · ` : ""}
          偏好{learningPreferences.mode}（{learningPreferences.content}）
        </p>
        {membership.plan === "free" ? (
          <p className="mt-xs text-caption text-muted-soft">
            免费版：本周诊断额度 {membership.diagnosisQuota - membership.usedDiagnosis}/
            {membership.diagnosisQuota}
          </p>
        ) : null}
      </Card>

      {coachHistory.length > 0 ? (
        <Card className="mt-lg" padding="dense">
          <p className="text-label-md text-muted">续接上次对话（F0174）</p>
          <p className="mt-xs text-body-sm text-body">上次：{coachHistory[coachHistory.length - 1]!.text}</p>
          <p className="mt-xs text-caption text-muted">上下文：{coachHistory[coachHistory.length - 1]!.context || "无"}</p>
        </Card>
      ) : null}

      {turns.length === 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">试试这样问</h2>
          <div className="mt-md space-y-md">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="w-full rounded-md border border-border bg-surface p-md text-left text-body-md text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-xl space-y-lg" aria-live="polite">
          {turns.map((t) =>
            t.role === "user" ? (
              <div key={t.id} className="flex justify-end">
                <p className="max-w-[80%] rounded-lg bg-primary p-md text-body-md text-on-primary">
                  {t.text}
                </p>
              </div>
            ) : (
              <div key={t.id} className="space-y-md">
                <p className="text-title-md text-ink">{t.reply!.conclusion}</p>
                <ul className="space-y-xs">
                  {t.reply!.evidence.map((e) => (
                    <li key={e} className="rounded-md bg-surface-soft p-md text-body-sm text-body">
                      <Chip tone="neutral">依据</Chip> <span className="ml-xs">{e}</span>
                    </li>
                  ))}
                </ul>
                {t.reply!.uncertainty ? (
                  <p className="text-caption text-warning">{t.reply!.uncertainty}</p>
                ) : null}
                <p className="text-body-md text-body">{t.reply!.advice}</p>
                <div className="flex flex-wrap gap-sm">
                  {t.reply!.actions.map((a) => (
                    <Link key={a.label} href={a.href}>
                      <Button variant="secondary">{a.label}</Button>
                    </Link>
                  ))}
                </div>
                {/* F0178/F0179/F0319 反馈与举报 */}
                <div className="flex items-center gap-md text-caption text-muted">
                  {hasFeedback(t.id) ? (
                    <span>已收到你的反馈</span>
                  ) : (
                    <>
                      <button type="button" onClick={() => feedback(t.id, true)} className="text-primary">
                        有帮助
                      </button>
                      <button type="button" onClick={() => feedback(t.id, false)} className="text-muted">
                        没帮助
                      </button>
                      <button
                        type="button"
                        onClick={() => feedback(t.id, null, true)}
                        className="text-warning"
                      >
                        举报这条解释
                      </button>
                    </>
                  )}
                </div>
              </div>
            ),
          )}
        </section>
      )}

      {/* 输入区（§7.14：label 不依赖 placeholder） */}
      <form
        className="sticky bottom-0 mt-xl flex items-center gap-sm bg-canvas pt-md pb-sm"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label className="sr-only" htmlFor="coach-input">
          向教练提问
        </label>
        <input
          id="coach-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="有问题，尽管问我"
          className="h-12 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-md text-ink placeholder:text-muted-soft"
          style={{ transitionDuration: `${duration.fast}ms` }}
        />
        <Button type="submit" disabled={input.trim() === ""}>
          发送
        </Button>
      </form>
      <p className="pb-sm text-center text-caption text-muted-soft">
        AI 建议仅供参考，请结合自身情况决策。
      </p>
    </main>
  );
}
