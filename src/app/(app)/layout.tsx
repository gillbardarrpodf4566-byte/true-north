import { BottomNav } from "@/components/nav/BottomNav";
import { OfflineBanner } from "@/components/ui/StateViews";

/** App Shell（(app) 路由组）：内容层 + Z3 功能层底部导航 + 离线提示 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <OfflineBanner />
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))]">{children}</div>
      <BottomNav />
    </div>
  );
}
