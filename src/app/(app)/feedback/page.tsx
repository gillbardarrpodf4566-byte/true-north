"use client";

/** 功能反馈（F0318）：问题/建议 + 可附截图；进入后台反馈工单（F0361/F0362）。 */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfileStore } from "@/lib/profile/store";

export default function FeedbackPage() {
  const { addFeedback, feedbacks } = useProfileStore();
  const [type, setType] = useState<"问题" | "建议" | "内容纠错">("问题");
  const [text, setText] = useState("");
  const [hasShot, setHasShot] = useState(false);
  const [done, setDone] = useState(false);
  // F0320：内容纠错必须能指向具体题目，否则工单无法定位也进不了质量闭环
  const [questionRef, setQuestionRef] = useState("");

  const submit = async (): Promise<void> => {
    if (text.trim().length < 5) return;
    if (type === "内容纠错" && questionRef.trim() === "") return;
    const target = type === "内容纠错" ? `session:${questionRef.trim()}` : undefined;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, text: text.trim(), hasScreenshot: hasShot, target }),
    });
    if (res.ok) {
      addFeedback({ type, text: text.trim(), hasScreenshot: hasShot });
      setDone(true);
      setText("");
      setHasShot(false);
      setQuestionRef("");
    } else {
      setDone(false);
    }
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">反馈</h1>
      <p className="mt-xs text-body-sm text-muted">
        问题和建议都会进入处理队列；AI 相关的反馈还会进入质量评测闭环。
      </p>

      <Card className="mt-lg">
        <div role="radiogroup" aria-label="反馈类型" className="flex gap-sm">
          {(["问题", "建议", "内容纠错"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`rounded-full border px-md py-sm text-label-md ${
                type === t
                  ? "border-primary bg-primary-faint text-primary-active"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {/* F0320：内容纠错需指明题目，工单才能定位并进入质量闭环 */}
        {type === "内容纠错" ? (
          <label className="mt-lg block">
            <span className="text-label-md text-muted">题目编号（在题干下方可见，如 fa-0）</span>
            <input
              value={questionRef}
              onChange={(e) => setQuestionRef(e.target.value.trim())}
              aria-label="题目编号"
              placeholder="必填，用于定位题目与解析"
              className="mt-xs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink focus:border-primary focus:outline-none"
            />
          </label>
        ) : null}
        <label className="mt-lg block">
          <span className="text-label-md text-muted">具体描述（做什么操作时发生了什么）</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-xs w-full rounded-sm border border-border-strong bg-surface p-md text-body-md text-ink focus:border-primary focus:outline-none"
            placeholder="例：在确认识别结果时，修改后的分数没有保存。"
          />
        </label>
        <label className="mt-md flex items-center gap-sm text-body-sm text-body">
          <input
            type="checkbox"
            checked={hasShot}
            onChange={(e) => setHasShot(e.target.checked)}
            className="h-4 w-4 accent-[var(--ja-color-primary)]"
          />
          附上截图（可选）
        </label>
        <Button className="mt-lg" fullWidth disabled={text.trim().length < 5 || (type === "内容纠错" && questionRef === "")} onClick={() => void submit()}>
          提交反馈
        </Button>
        {done ? (
          <p role="status" className="mt-md text-body-sm text-success">
            已提交到处理队列，可在下方查看记录。
          </p>
        ) : null}
      </Card>

      {feedbacks.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">我的反馈（{feedbacks.length}）</h2>
          <ul className="mt-md space-y-md">
            {feedbacks.map((f) => (
              <li key={f.id} className="rounded-md border border-border bg-surface p-md">
                <p className="text-label-md text-muted">
                  {f.type} · {new Date(f.at).toLocaleDateString("zh-CN")}
                  {f.hasScreenshot ? " · 附截图" : ""}
                </p>
                <p className="mt-xs text-body-sm text-body">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
