"use client";

/**
 * 我的 Tab — §11.15。MVP 覆盖：F0323 基础资料 / F0324+F0290 通知偏好 /
 * F0327 数据清单 / F0330 AI 数据使用说明 / F0333 退出登录 / 夜间主题切换 / 入口集合。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/lib/profile/store";
import { fetchMe, logout, recordPermission, type AuthUser } from "@/lib/auth/client";

export default function MePage() {
  const router = useRouter();
  const {
    profile,
    imports,
    membership,
    favorites,
    notifications,
    setNotifications,
    setNickname,
    reset,
  } = useProfileStore();

  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname);
  const [night, setNight] = useState(false);
  /** F0008 通知权限（系统授权 + 授权记录入库） */
  const [notifPerm, setNotifPerm] = useState<"未申请" | "已授权" | "已拒绝" | "本机模式">(
    "未申请",
  );
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => {
    setNight(document.documentElement.dataset.theme === "night");
    void fetchMe().then((u) => {
      setMe(u);
      if (u && typeof Notification !== "undefined") {
        setNotifPerm(
          Notification.permission === "granted"
            ? "已授权"
            : Notification.permission === "denied"
              ? "已拒绝"
              : "未申请",
        );
      }
    });
  }, []);

  const toggleNight = (): void => {
    const next = !night;
    setNight(next);
    document.documentElement.dataset.theme = next ? "night" : "light";
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">我的</h1>

      <div className="mt-xl space-y-lg">
        {/* 基础资料（F0323） */}
        <Card>
          <p className="text-label-md text-muted">基础资料</p>
          <div className="mt-sm flex items-center gap-md">
            <input
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onBlur={() => setNicknameDraft(nicknameDraft.trim())}
              aria-label="昵称"
              placeholder="给自己一个称呼"
              className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-md text-ink"
            />
            <Button variant="secondary" onClick={() => setNickname(nicknameDraft.trim())}>
              保存
            </Button>
          </div>
          <p className="mt-xs text-caption text-muted">地区与头像在 V1 开放。</p>
        </Card>

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
              工作日 {profile.conditions.weekdayMinutes} 分钟 · 周末{" "}
              {profile.conditions.weekendMinutes} 分钟 · {profile.conditions.stage}
            </p>
          ) : (
            <p className="mt-xs text-body-md text-muted">尚未设置。</p>
          )}
        </Card>

        {/* 通知偏好（F0290/F0324） */}
        <Card>
          <p className="text-label-md text-muted">通知偏好</p>
          <div className="mt-sm space-y-sm">
            <ToggleRow
              label="今日任务提醒"
              checked={notifications.taskReminder}
              onChange={(v) => setNotifications({ taskReminder: v })}
            />
            <ToggleRow
              label="诊断完成通知"
              checked={notifications.diagnosisReady}
              onChange={(v) => setNotifications({ diagnosisReady: v })}
            />
            <ToggleRow
              label="考试节点提醒"
              checked={notifications.examDeadline}
              onChange={(v) => setNotifications({ examDeadline: v })}
            />
          </div>
          <p className="mt-sm text-caption text-muted">
            提醒时段 {notifications.window}；只在有行动价值时提醒，不做打卡轰炸。
          </p>
        </Card>

        <Card>
          <p className="text-label-md text-muted">账号</p>
          {me ? (
            <p className="mt-xs text-body-md text-body">
              {me.phone}
              {me.nickname ? ` · ${me.nickname}` : ""}
            </p>
          ) : (
            <p className="mt-xs text-body-md text-body">
              本机模式（未登录）——数据只存在这台设备上。
            </p>
          )}
          <div className="mt-md flex flex-wrap gap-md">
            {me ? (
              <Button
                variant="tertiary"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                退出登录（F0333）
              </Button>
            ) : (
              <Button variant="tertiary" onClick={() => router.push("/login")}>
                手机号登录
              </Button>
            )}
            {/* F0008 通知权限：说明→授权→记录入库（F0006 审计流程） */}
            <Button
              variant="tertiary"
              onClick={async () => {
                if (typeof Notification === "undefined") {
                  setNotifPerm("本机模式");
                  return;
                }
                const result = await Notification.requestPermission();
                setNotifPerm(
                  result === "granted" ? "已授权" : result === "denied" ? "已拒绝" : "未申请",
                );
                await recordPermission("notification", result === "granted");
              }}
            >
              通知权限：{notifPerm}
            </Button>
          </div>
          {notifPerm === "已拒绝" ? (
            <p className="mt-sm text-caption text-muted">
              系统已拒绝通知。想恢复请在浏览器站点设置里重新允许；提醒仍会出现在应用内。
            </p>
          ) : null}
        </Card>

        <Card>
          <p className="text-label-md text-muted">外观</p>
          <div className="mt-sm flex items-center justify-between">
            <span className="text-body-md text-body">夜间学习主题</span>
            <button
              type="button"
              role="switch"
              aria-checked={night}
              onClick={toggleNight}
              className={`h-8 w-14 rounded-full border transition-colors ${
                night ? "border-primary bg-primary" : "border-border-strong bg-surface-strong"
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-surface transition-transform ${
                  night ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </Card>

        <Card>
          <p className="text-label-md text-muted">数据与隐私</p>
          <p className="mt-xs text-body-md text-body">
            已导入 {imports.length} 次成绩 · 收藏 {favorites.length} 题 · 全部数据保存在本机。
          </p>
          {/* F0327 数据清单 */}
          <details className="mt-md">
            <summary className="cursor-pointer text-body-sm text-primary">查看系统保存的数据清单</summary>
            <ul className="mt-sm list-disc space-y-xs pl-lg text-caption text-muted">
              <li>考试目标与学习条件（你填写）</li>
              <li>模考成绩记录（你确认后写入）</li>
              <li>训练作答轨迹与错题本（系统记录）</li>
              <li>诊断/处方/周复盘结论（AI 生成，可追溯证据）</li>
              <li>反馈与 AI 打分记录（你主动提交）</li>
            </ul>
          </details>
          {/* F0330 AI 数据使用说明 */}
          <details className="mt-sm">
            <summary className="cursor-pointer text-body-sm text-primary">AI 数据使用说明</summary>
            <p className="mt-sm text-body-sm text-body">
              发送给模型的内容仅限：你确认过的成绩字段、错题的题目文本与作答选择、你的目标与可用时间。
              不发送：手机号等账号信息、原始截图（仅本地解析的字段）。模型输出不会在你确认前写入档案。
            </p>
          </details>
          <div className="mt-md flex flex-wrap gap-md">
            <Button variant="tertiary" onClick={() => router.push("/feedback")}>
              反馈
            </Button>
            <Button variant="tertiary" onClick={() => router.push("/help")}>
              帮助中心
            </Button>
            <Button
              variant="tertiary"
              onClick={async () => {
                if (confirm("确定清除本机全部档案数据吗？此操作不可撤销。")) {
                  await logout();
                  reset();
                  router.replace("/onboarding");
                }
              }}
            >
              清除本机数据
            </Button>
          </div>
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-md text-body">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-8 w-14 rounded-full border transition-colors ${
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface-strong"
        }`}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-surface transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
