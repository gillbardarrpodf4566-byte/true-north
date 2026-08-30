"use client";

/** 训练会话占位（Phase 3 实现 §11.6）；Phase 2 先保证处方 → 训练入口可达（F0057）。 */
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfileStore } from "@/lib/profile/store";

export default function SessionPlaceholderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { prescription } = useProfileStore();
  const task = prescription?.tasks.find((t) => t.id === params.id);

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-lg text-ink">{task ? task.title : "训练"}</h1>
      {task ? (
        <Card className="mt-lg">
          <p className="text-body-sm text-body">{task.successCriteria}</p>
          <p className="mt-xs text-caption text-muted">
            目标能力：{task.targetAbility} · 预估 {task.minutes} 分钟 · {task.questionCount} 题
          </p>
        </Card>
      ) : null}
      <p className="mt-lg text-body-sm text-muted">
        答题界面在 Phase 3 接入（§11.6 Training Session）。当前可返回今日继续其他任务。
      </p>
      <Button className="mt-lg" variant="secondary" fullWidth onClick={() => router.push("/today")}>
        返回今日
      </Button>
    </main>
  );
}
