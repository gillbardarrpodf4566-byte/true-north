"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getToken } from "@/lib/auth/client";

/** 帮助中心（F0321 常见问题）+ 人工支持入口（F0322 转人工并可追踪状态）。 */
const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "见岸和刷题 App 有什么不同？",
    a: "题库类产品给你更多题；见岸根据你的真实成绩与训练数据，判断此刻最值得解决的一个问题，并把它变成今天可以完成的训练。",
  },
  {
    q: "上传的成绩截图会被如何使用？",
    a: "仅用于生成你的个人基线与诊断。识别结果必须经你逐项确认才会写入；你可以在「我的-数据与隐私」查看与清除全部数据。",
  },
  {
    q: "AI 的判断一定对吗？",
    a: "不一定。每个诊断都附证据与置信度；数据不足时会明确说「证据还不够稳定」。你随时可以纠正 AI 的错因判断，纠正本身就是校准。",
  },
  {
    q: "为什么处方只有 1–3 个任务？",
    a: "每日核心任务控制在 1–3 项、总时长不超过你的可用预算。少而具体，比长清单更容易完成并产生可验证的进步。",
  },
  {
    q: "诊断次数用完了怎么办？",
    a: "免费额度每周重置；训练产生的常规反馈不受额度限制。见「订阅与权益」了解升级选项。",
  },
];

export default function HelpPage() {
  const [text, setText] = useState("");
  const [ticket, setTicket] = useState<{ id: number; status: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // F0322：转人工生成真实工单，并把工单号回显给用户，而不是只提示「联系人工客服」。
  const escalate = async (): Promise<void> => {
    if (text.trim().length < 5 || sending) return;
    setSending(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: "问题", target: "support:manual", text: text.trim(), hasScreenshot: false }),
      });
      const data = (await res.json()) as { ok: boolean; ticketId?: number; message?: string };
      if (!data.ok) {
        setError(data.message ?? "提交失败，请稍后重试。");
        return;
      }
      setTicket({ id: data.ticketId ?? 0, status: "待处理" });
      setText("");
    } catch {
      setError("网络异常，问题没有提交。重试不会产生重复工单。");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">帮助中心</h1>
      <div className="mt-lg space-y-md">
        {FAQ.map((f) => (
          <Card key={f.q}>
            <p className="text-title-md text-ink">{f.q}</p>
            <p className="mt-sm text-body-md text-body">{f.a}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-xl">
        <p className="text-title-md text-ink">联系人工客服</p>
        <p className="mt-xs text-body-sm text-muted">
          FAQ 没解决的问题可以转人工。提交后会生成工单号，客服在后台按顺序处理。
        </p>
        <label className="mt-md block">
          <span className="text-label-md text-muted">问题描述</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            aria-label="人工客服问题描述"
            placeholder="例：会员已支付但权益没有生效，订单时间是今天 10:20。"
            className="mt-xs w-full rounded-sm border border-border-strong bg-surface p-md text-body-md text-ink focus:border-primary focus:outline-none"
          />
        </label>
        <Button className="mt-md" fullWidth disabled={text.trim().length < 5} loading={sending} onClick={() => void escalate()}>
          转人工客服
        </Button>
        {ticket ? (
          <p role="status" className="mt-md text-body-sm text-success">
            已创建人工工单{ticket.id > 0 ? ` #${ticket.id}` : ""}，当前状态：{ticket.status}。处理结果会在此工单更新。
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-md text-body-sm text-error">{error}</p>
        ) : null}
      </Card>

      <p className="mt-xl text-caption text-muted">
        也可以在
        <Link href="/feedback" className="mx-xxs text-primary underline-offset-2 hover:underline">反馈</Link>
        提交产品建议，或查看「AI 数据使用说明」了解数据边界。
      </p>
    </main>
  );
}
