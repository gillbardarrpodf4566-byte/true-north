"use client";

/**
 * 启动页（F0001 品牌启动与首屏加载）— §8.6 App Launch：
 * 1. Canvas 立即出现，wordmark 短促 opacity 进场（不播长品牌动画）
 * 2. 加载 >600ms 才出现结构 skeleton（不拖延）
 * 3. 数据就绪直接进入目标页：有登录态 → /today；未登录按本机档案路由；
 *    完全新用户 → 登录/引导。
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/StateViews";
import { fetchMe, getToken } from "@/lib/auth/client";
import { useProfileStore } from "@/lib/profile/store";
import { duration } from "@/design/tokens";

export default function SplashPage() {
  const router = useRouter();
  const { profile, imports, baseline } = useProfileStore();
  const [wordmarkIn, setWordmarkIn] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setWordmarkIn(true), 30);
    const b = setTimeout(() => setSlow(true), 600);
    let cancelled = false;

    (async () => {
      const token = getToken();
      const me = token ? await fetchMe() : null;
      if (cancelled) return;
      if (me) {
        router.replace("/today");
        return;
      }
      // 未登录：兼容本机档案模式（老用户协议已确认则继续用本地数据）
      if (!profile.agreements?.userAgreement) router.replace("/onboarding");
      else if (imports.length === 0) router.replace("/import");
      else router.replace(baseline ? "/today" : "/baseline");
    })();

    return () => {
      cancelled = true;
      clearTimeout(a);
      clearTimeout(b);
    };
    // 仅首挂载执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center px-margin-mobile">
      <div
        className="flex flex-col items-center"
        style={{
          opacity: wordmarkIn ? 1 : 0,
          transition: `opacity ${duration.state}ms ${"var(--ja-easing-standard)"}`,
        }}
      >
        {/* 品牌标记：圆形内水平弧线（§7.12 今日 icon 同源） */}
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="24" stroke="var(--ja-color-primary)" strokeWidth="2.5" />
          <path
            d="M12 33h32"
            stroke="var(--ja-color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M20 26l6-6 4.5 4.5L36 19"
            stroke="var(--ja-color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-lg text-display-app text-ink">见岸</p>
        <p className="mt-sm text-body-sm text-muted">每一步清晰的努力，都会把你带到岸边。</p>
      </div>

      {/* >600ms 才出现 skeleton（§8.6：初始化长时不靠品牌动画拖延） */}
      {slow ? (
        <div className="mt-section w-full space-y-md" aria-hidden="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : null}

      <p className="sr-only">正在进入见岸…</p>
    </main>
  );
}
