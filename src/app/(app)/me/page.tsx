"use client";

/** 我的 Tab — §11.15：考试目标 / 数据与隐私 / 设置（MVP 先落目标与重置）。 */
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/lib/profile/store";

export default function MePage() {
  const { profile, imports, membership, reset } = useProfileStore();

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">我的</h1>

      <div className="mt-xl space-y-lg">
        <Card>
          <p className="text-label-md text-muted">考试目标</p>
          {profile.goal ? (
            <p className="mt-xs text-body-md text-body">
              {profile.goal.examName} · {profile.goal.region} · 目标 {profile.goal.targetTotal} 分 ·{" "}
              {profile.goal.examDate}
            </p>
          ) : (
            <p className="mt-xs text-body-md text-muted">尚未设置。</p>
          )}
          <Link href="/onboarding" className="mt-md inline-block">
            <Button variant="tertiary">修改目标</Button>
          </Link>
        </Card>

        <Card>
          <p className="text-label-md text-muted">学习条件</p>
          {profile.conditions ? (
            <p className="mt-xs text-body-md text-body">
              工作日 {profile.conditions.weekdayMinutes} 分钟 · 周末 {profile.conditions.weekendMinutes} 分钟 ·{" "}
              {profile.conditions.stage}
            </p>
          ) : (
            <p className="mt-xs text-body-md text-muted">尚未设置。</p>
          )}
        </Card>

        <Card>
          <p className="text-label-md text-muted">数据与隐私</p>
          <p className="mt-xs text-body-md text-body">
            已导入 {imports.length} 次成绩，全部保存在本机。
          </p>
          <Button
            variant="tertiary"
            className="mt-md"
            onClick={() => {
              if (confirm("确定清除本机全部档案数据吗？此操作不可撤销。")) reset();
            }}
          >
            清除本机数据
          </Button>
        </Card>

        <Link
          href="/membership"
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-lg py-md"
        >
          <span className="text-body-md text-ink">订阅与权益</span>
          <span className="text-caption text-muted">
            {membership.plan === "free" ? "免费版 ›" : "见岸 Pro ›"}
          </span>
        </Link>
      </div>
    </main>
  );
}
