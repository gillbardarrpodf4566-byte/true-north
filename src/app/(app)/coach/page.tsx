import { EmptyState } from "@/components/ui/StateViews";

/** 教练 Tab 占位 — Phase 4 接入 Coach（§11.8，非空白聊天页）。 */
export default function CoachPage() {
  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">教练</h1>
      <div className="mt-xl">
        <EmptyState
          why="教练需要先了解你的数据才能开口。"
          action="建立基线后，教练会带着你的目标、焦点与最近变化出现在这里。"
        />
      </div>
    </main>
  );
}
