"use client";

/** Today — §11.2 骨架（Phase 2 接入 Horizon Focus 与处方）。 */
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/StateViews";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/lib/profile/store";

export default function TodayPage() {
  const { profile, baseline } = useProfileStore();

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header>
        <p className="text-caption text-muted">{formatDate(new Date())}</p>
        <h1 className="mt-xs text-display-app text-ink">今天，先看清一件事。</h1>
      </header>

      {baseline == null ? (
        <div className="mt-xl">
          <EmptyState
            why="还没有你的成绩数据，今天最重要的判断还出不来。"
            action="导入一次模考成绩后，这里会告诉你今天最值得解决什么。"
            cta="去导入成绩"
            onAction={() => (window.location.href = "/import")}
          />
        </div>
      ) : (
        <div className="mt-xl space-y-lg">
          <Card tone="faint" padding="focus" radius="xl">
            <p className="text-micro text-primary">今日焦点</p>
            <p className="mt-sm text-title-lg text-ink">基线已建立，正在生成第一次诊断。</p>
            <p className="mt-xs text-body-sm text-body">
              {baseline.dataNote}
            </p>
            <Link href="/progress" className="mt-lg inline-block">
              <Button variant="secondary">先看看我的基线</Button>
            </Link>
          </Card>
          {profile.goal ? (
            <Card>
              <p className="text-label-md text-muted">目标</p>
              <p className="mt-xs text-body-md text-body">
                {profile.goal.examName} · {profile.goal.region} · 目标 {profile.goal.targetTotal} 分
              </p>
            </Card>
          ) : null}
        </div>
      )}
    </main>
  );
}

function formatDate(d: Date): string {
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`;
}
