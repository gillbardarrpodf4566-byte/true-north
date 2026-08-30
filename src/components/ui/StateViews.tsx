"use client";

/**
 * §18 四态 + §14 文案结构。
 * Loading：skeleton 匹配最终布局，不做伪步骤。
 * Empty：为什么空 → 可以做什么 → 完成后会得到什么。
 * Error：发生什么 → 数据有没有丢 → 怎么恢复。
 * Offline：学习不会丢，而非「网络错误」。
 */
import { useEffect, useState } from "react";
import { Button } from "./Button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-strong ${className}`} />;
}

export function EmptyState({
  why,
  action,
  cta,
  onAction,
}: {
  why: string;
  action: string;
  cta?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-md rounded-lg border border-border bg-surface p-xl text-center">
      <p className="text-body-md text-body">{why}</p>
      <p className="text-caption text-muted">{action}</p>
      {cta && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {cta}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  what,
  dataSafe = "你刚才输入的数据已经保存。",
  retryLabel = "重试",
  onRetry,
}: {
  what: string;
  dataSafe?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-sm rounded-lg border border-border bg-surface p-lg">
      <p className="text-body-md text-ink">{what}</p>
      <p className="text-body-sm text-muted">{dataSafe}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="bg-info-soft px-lg py-md text-body-sm text-info">
      当前离线。你的作答与修改都保存在本机，恢复联网后会自动同步。
    </div>
  );
}
