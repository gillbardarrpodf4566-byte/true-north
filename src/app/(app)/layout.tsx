import { BottomNav } from "@/components/nav/BottomNav";
import { OfflineBanner } from "@/components/ui/StateViews";

/**
 * App Shell（(app) 路由组）：内容层 + Z3 功能层底部导航 + 离线提示。
 * 底部内边距取 section-lg token（= 导航高度），保证内容可从材质导航下穿过
 * 且最后一项能滚到栏上方；不留硬编码 px。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <OfflineBanner />
      <div className="pb-[calc(var(--ja-space-section-lg)+env(safe-area-inset-bottom))]">{children}</div>
      <BottomNav />
    </div>
  );
}
