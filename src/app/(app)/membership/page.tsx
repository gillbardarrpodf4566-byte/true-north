"use client";

/**
 * Membership — CL-09 最小闭环 + F0307–F0312。
 * 免费版额度透明展示；权益对比（F0309）；mock 支付（订单结果三态 F0312：
 * 处理中 → 成功/失败）；到期/续费文案说明已获得价值（CL-09 step4）。
 * MVP 不接真实支付渠道（spec-gaps GAP-5）。
 */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useProfileStore } from "@/lib/profile/store";

const BENEFITS: Array<{ name: string; free: string; pro: string }> = [
  { name: "AI 提分诊断", free: "每周 3 次", pro: "不限次数" },
  { name: "AI 教练", free: "每日 20 条", pro: "不限 + 优先上下文" },
  { name: "深度诊断证据", free: "基础证据", pro: "完整证据链与对比基线" },
  { name: "高级趋势", free: "总分与模块趋势", pro: "时间结构 / 稳定性分析" },
];

export default function MembershipPage() {
  const { membership, purchaseMembership, restorePurchase, requestRefund } = useProfileStore();
  const [order, setOrder] = useState<"idle" | "处理中" | "成功" | "失败">("idle");
  const [plan, setPlan] = useState<"pro-monthly" | "pro-yearly">("pro-monthly");

  const pay = (): void => {
    setOrder("处理中");
    // mock 支付：95% 成功；真实渠道接入点（GAP-5）
    setTimeout(() => {
      const ok = Math.random() > 0.05 || process.env.NODE_ENV !== "production";
      purchaseMembership(plan, ok);
      setOrder(ok ? "成功" : "失败");
    }, 900);
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">订阅与权益</h1>

      <Card className="mt-lg" tone="faint" radius="lg">
        <div className="flex items-center justify-between">
          <p className="text-title-md text-ink">
            {membership.plan === "free" ? "免费版" : "见岸 Pro"}
          </p>
          <Chip tone={membership.plan === "free" ? "neutral" : "opportunity"}>
            {membership.plan === "free" ? "免费版" : "Pro 已开通"}
          </Chip>
        </div>
        <p className="mt-xs text-body-sm text-body">
          本周诊断额度：{membership.plan === "free"
            ? `${membership.diagnosisQuota - membership.usedDiagnosis}/${membership.diagnosisQuota}`
            : "不限"}
        </p>
        {/* F0313 AI 额度 */}
        <p className="mt-xs text-caption text-muted">
          AI / 批改额度：{membership.plan === "free" ? `${Math.max(0, membership.aiQuota - membership.usedAi)}/${membership.aiQuota}` : "不限"}
          {membership.expiresAt ? ` · 权益至 ${membership.expiresAt.slice(0, 10)}` : ""}
        </p>
      </Card>

      {/* F0312 订单结果三态（顶层呈现，不随套餐区块卸载） */}
      {order === "处理中" ? (
        <p role="status" className="mt-md text-body-md text-muted" aria-live="polite">
          订单处理中…
        </p>
      ) : null}
      {order === "成功" ? (
        <div className="mt-md rounded-md border border-success bg-success-soft p-md" role="status">
          <p className="text-body-md text-ink">订阅成功，Pro 权益已即时开通。</p>
          <p className="mt-xs text-caption text-muted">
            到期前我们会说明这段时间你实际获得了什么，再由你决定是否续费。
          </p>
        </div>
      ) : null}
      {order === "失败" ? (
        <p role="status" className="mt-md text-caption text-warning">
          订单结果：支付失败。未扣款，权益未变化，可安全重试。
        </p>
      ) : null}

      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">权益对比</h2>
        <div className="mt-md overflow-hidden rounded-lg border border-border">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-soft text-left text-muted">
                <th className="p-md font-medium">能力</th>
                <th className="p-md font-medium">免费</th>
                <th className="p-md font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {BENEFITS.map((b) => (
                <tr key={b.name} className="border-t border-border bg-surface">
                  <th scope="row" className="p-md text-left font-normal text-ink">
                    {b.name}
                  </th>
                  <td className="p-md text-muted">{b.free}</td>
                  <td className="p-md text-body">{b.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {membership.plan === "free" ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">选择套餐</h2>
          <div className="mt-md space-y-md">
            {(
              [
                { key: "pro-monthly", label: "月度 Pro", price: "¥ 39 / 月" },
                { key: "pro-yearly", label: "年度 Pro", price: "¥ 299 / 年" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={plan === p.key}
                onClick={() => setPlan(p.key)}
                className={`flex w-full items-center justify-between rounded-md border p-md text-left ${
                  plan === p.key ? "border-primary bg-primary-faint" : "border-border bg-surface"
                }`}
              >
                <span className="text-body-md text-ink">{p.label}</span>
                <span className="text-label-md text-muted">{p.price}</span>
              </button>
            ))}
          </div>

          {order === "idle" || order === "失败" ? (
            <Button className="mt-lg" fullWidth onClick={pay}>
              {order === "失败" ? "支付失败，重试" : "确认订阅（模拟支付）"}
            </Button>
          ) : null}
          <p className="mt-md text-caption text-muted-soft">
            MVP 为模拟支付，不会产生真实扣款。
          </p>
        </section>
      ) : null}

      <section className="mt-xl space-y-md">
        {/* F0311 恢复购买 */}
        <Button variant="secondary" fullWidth onClick={restorePurchase}>
          恢复历史订阅
        </Button>
        {/* F0315 退款入口：渠道规则与提交 */}
        <details>
          <summary className="cursor-pointer text-body-sm text-primary">退款规则与入口</summary>
          <div className="mt-sm rounded-md bg-surface-soft p-md text-body-sm text-body">
            <p>App Store / Apple 渠道：请在对应商店订阅管理中申请退款。</p>
            <p className="mt-xs">微信渠道：可在此提交退款申请，客服将在 3 个工作日内处理。</p>
            <Button className="mt-sm" variant="tertiary" onClick={() => requestRefund("微信", "用户主动申请退款")}>提交微信退款申请</Button>
          </div>
        </details>
        {/* F0314 到期提醒 */}
        {membership.expiresAt ? <p className="text-caption text-muted">到期前 7 天将提醒：续费不会丢失历史画像；不续费则高级诊断/批改额度回到免费版。</p> : null}
      </section>

      {membership.orders.length > 0 ? (
        <section className="mt-xl">
          <h2 className="text-title-lg text-ink">订单记录</h2>
          <ul className="mt-md space-y-xs text-body-sm text-body">
            {membership.orders
              .slice()
              .reverse()
              .map((o) => (
                <li key={o.id} className="flex justify-between rounded-sm bg-surface-soft px-md py-sm">
                  <span>{o.plan === "pro-monthly" ? "月度 Pro" : "年度 Pro"}</span>
                  <span className={o.status === "成功" ? "text-success" : "text-warning"}>
                    {o.status} · {o.at.slice(5, 16).replace("T", " ")}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
