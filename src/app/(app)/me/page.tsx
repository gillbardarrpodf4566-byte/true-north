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
import { deleteAccount, fetchMe, logout, recordPermission, type AuthUser } from "@/lib/auth/client";

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
    setProfile,
    learningPreferences,
    privacy,
    setLearningPreferences,
    setPrivacy,
    reset,
  } = useProfileStore();

  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname);
  const [regionDraft, setRegionDraft] = useState(profile.region ?? "");
  const [night, setNight] = useState(false);
  /** F0008 通知权限（系统授权 + 授权记录入库） */
  const [notifPerm, setNotifPerm] = useState<"未申请" | "已授权" | "已拒绝" | "本机模式">(
    "未申请",
  );
  const [me, setMe] = useState<AuthUser | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

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
    void fetch("/api/auth/provider", {
      headers: { ...(localStorage.getItem("jianan-token") ? { authorization: `Bearer ${localStorage.getItem("jianan-token")}` } : {}) },
    })
      .then((r) => r.json())
      .then((d: { ok: boolean; providers?: Array<{ provider: string }> }) => {
        if (d.ok) setLinkedProviders((d.providers ?? []).map((p) => p.provider));
      })
      .catch(() => undefined);
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
              aria-label="昵称"
              placeholder="给自己一个称呼"
              className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-md text-ink"
            />
            <Button variant="secondary" onClick={() => setNickname(nicknameDraft.trim())}>
              保存
            </Button>
          </div>
          <div className="mt-md flex items-center gap-md">
            <label className="flex-1">
              <span className="text-caption text-muted">常用地区</span>
              <input
                value={regionDraft}
                onChange={(e) => setRegionDraft(e.target.value)}
                aria-label="常用地区"
                placeholder="如 广东省"
                className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              />
            </label>
            <Button variant="secondary" onClick={() => setProfile({ region: regionDraft.trim() })}>
              保存
            </Button>
          </div>
          <p className="mt-xs text-caption text-muted">头像可填写图片地址；不上传到模型。</p>
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
          <p className="text-label-md text-muted">学习偏好与教练风格（F0023/F0025/F0026/F0325）</p>
          <div className="mt-md grid grid-cols-2 gap-md">
            <PreferenceSelect
              label="练习长度"
              value={learningPreferences.mode}
              options={["短练", "长练", "混合"]}
              onChange={(v) => setLearningPreferences({ mode: v as typeof learningPreferences.mode })}
            />
            <PreferenceSelect
              label="内容形式"
              value={learningPreferences.content}
              options={["文字", "互动"]}
              onChange={(v) => setLearningPreferences({ content: v as typeof learningPreferences.content })}
            />
            <PreferenceSelect
              label="教练风格"
              value={learningPreferences.coachStyle}
              options={["直接", "温和", "苏格拉底式"]}
              onChange={(v) => setLearningPreferences({ coachStyle: v as typeof learningPreferences.coachStyle })}
            />
            <div>
              <span className="text-caption text-muted">主动支持</span>
              <button
                type="button"
                role="switch"
                aria-checked={learningPreferences.proactive}
                onClick={() => setLearningPreferences({ proactive: !learningPreferences.proactive })}
                className={`mt-xxs block h-8 w-14 rounded-full border ${
                  learningPreferences.proactive ? "border-primary bg-primary" : "border-border-strong bg-surface-strong"
                }`}
              >
                <span className={`block h-6 w-6 rounded-full bg-surface ${learningPreferences.proactive ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <label className="mt-md block">
            <span className="text-caption text-muted">已有资源（F0023，可多项用逗号分隔）</span>
            <input
              value={learningPreferences.resources.join("、")}
              onChange={(e) => setLearningPreferences({ resources: e.target.value.split(/[、,，]/).map((v) => v.trim()).filter(Boolean) })}
              aria-label="已有资源"
              placeholder="如 粉笔题库、线下课程"
              className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
            />
          </label>
        </Card>

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
            <ToggleRow
              label="复习到期提醒"
              checked={notifications.review}
              onChange={(v) => setNotifications({ review: v })}
            />
            <ToggleRow
              label="进步证据提醒"
              checked={notifications.progress}
              onChange={(v) => setNotifications({ progress: v })}
            />
            <ToggleRow
              label="允许主动支持（可降频）"
              checked={notifications.proactive}
              onChange={(v) => setNotifications({ proactive: v })}
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
            {(["wechat", "apple"] as const).map((provider) => {
              const linked = linkedProviders.includes(provider);
              return (
                <Button
                  key={provider}
                  variant="tertiary"
                  onClick={async () => {
                    const action = linked ? "unlink" : "link";
                    const res = await fetch("/api/auth/provider", {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                        ...(localStorage.getItem("jianan-token") ? { authorization: `Bearer ${localStorage.getItem("jianan-token")}` } : {}),
                      },
                      body: JSON.stringify({
                        action,
                        provider,
                        authorizationCode: provider === "wechat" ? "mock-wechat-link-code" : "mock-apple-link-code",
                      }),
                    });
                    if (res.ok) {
                      setLinkedProviders((current) => linked ? current.filter((p) => p !== provider) : [...current, provider]);
                    }
                  }}
                >
                  {linked ? `解除${provider === "wechat" ? "微信" : "Apple"}绑定` : `绑定${provider === "wechat" ? "微信" : "Apple"}`}
                </Button>
              );
            })}
          </div>
          <div className="mt-md flex flex-wrap gap-md">
            {me ? (
              <Button
                variant="tertiary"
                onClick={async () => {
                  await logout();
                  reset();
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
          {/* F0328 截图保留策略 */}
          <div className="mt-md">
            <p className="text-caption text-muted">原始成绩截图保留策略（F0328）</p>
            <div className="mt-xs flex gap-sm" role="group" aria-label="截图保留策略">
              {(["识别后保留", "确认后自动删除"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={privacy.screenshotPolicy === opt}
                  onClick={() => setPrivacy({ screenshotPolicy: opt })}
                  className={`rounded-full border px-md py-sm text-caption ${
                    privacy.screenshotPolicy === opt
                      ? "border-primary bg-primary-faint text-primary-active"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          {/* F0329 个性化开关 */}
          <div className="mt-md flex items-center justify-between">
            <span className="text-body-sm text-body">基于学习行为的个性化推荐（F0329）</span>
            <button
              type="button"
              role="switch"
              aria-label="基于学习行为的个性化推荐（F0329）"
              aria-checked={privacy.personalization}
              onClick={() => setPrivacy({ personalization: !privacy.personalization })}
              className={`h-7 w-12 rounded-full border transition-colors ${
                privacy.personalization ? "border-primary bg-primary" : "border-border-strong bg-surface-strong"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-surface transition-transform ${
                  privacy.personalization ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {privacy.personalization ? null : (
            <p className="mt-xs text-caption text-muted-soft">
              已关闭：处方仍基于你的成绩数据生成，但不再使用行为轨迹做个性化排序。
            </p>
          )}
          {/* F0332 按类删除 */}
          <details className="mt-md">
            <summary className="cursor-pointer text-body-sm text-primary">删除指定数据（F0332）</summary>
            <div className="mt-sm flex flex-wrap gap-sm">
              <Button
                variant="tertiary"
                onClick={() => {
                  if (confirm(`删除全部 ${imports.length} 条成绩记录？不可恢复。`)) {
                    useProfileStore.setState({ imports: [], baseline: null, diagnosis: null, prescription: null });
                    router.replace("/import");
                  }
                }}
              >
                删除成绩记录
              </Button>
              <Button
                variant="tertiary"
                onClick={() => {
                  if (confirm("删除全部训练与错题记录？不可恢复。")) {
                    useProfileStore.setState({ sessions: [], wrongBook: [], taskResults: [] });
                  }
                }}
              >
                删除训练与错题
              </Button>
            </div>
          </details>
          {/* F0334 注销账号 */}
          <details className="mt-sm">
            <summary className="cursor-pointer text-body-sm text-error">注销账号（F0334）</summary>
            <p className="mt-sm text-caption text-muted">
              注销将删除服务器上的账号、成绩与全部个性化数据，且不可恢复。
            </p>
            <Button
              variant="tertiary"
              className="mt-sm"
              onClick={async () => {
                if (confirm("确定注销账号吗？服务器与本机数据都会删除，且不可恢复。")) {
                  const deleted = await deleteAccount();
                  if (deleted || !me) {
                    reset();
                    router.replace("/");
                  }
                }
              }}
            >
              确认注销
            </Button>
          </details>
          <div className="mt-md flex flex-wrap gap-md">
            <Button variant="tertiary" onClick={() => router.push("/messages")}>
              消息中心
            </Button>
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

function PreferenceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-caption text-muted">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-sm text-body-sm text-ink"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
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
