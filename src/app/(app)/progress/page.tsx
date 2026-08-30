import { EmptyState } from "@/components/ui/StateViews";

/** 进展 Tab 占位 — Phase 4 接入 Progress + Weekly Review（§11.9/§11.10）。 */
export default function ProgressPage() {
  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">进展</h1>
      <div className="mt-xl">
        <EmptyState
          why="还没有足够数据形成趋势。"
          action="完成 2 次模考或 3 次专项训练后，这里会开始出现你的个人基线与趋势。"
        />
      </div>
    </main>
  );
}
