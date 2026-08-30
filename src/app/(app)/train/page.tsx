import { EmptyState } from "@/components/ui/StateViews";

/** 训练 Tab 占位 — Phase 3 接入 Practice Hub（§11.5）。Empty 文案按 §18.2。 */
export default function TrainPage() {
  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">训练</h1>
      <div className="mt-xl">
        <EmptyState
          why="训练中心还没有内容，因为你还没有建立学习处方。"
          action="完成首次建档并导入成绩后，系统会生成今天最值得做的训练。"
        />
      </div>
    </main>
  );
}
