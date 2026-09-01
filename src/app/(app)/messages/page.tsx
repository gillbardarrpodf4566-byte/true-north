"use client";

/** 消息中心（V1 F0316 系统消息 / F0317 学习消息统一管理）。 */
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import { buildExamNodeNotifications, buildReviewNotifications, progressNotification, shouldNotify, trainingAccuracyProgress } from "@/lib/notifications/engine";
import { computeAbilityDimensions, reviewOpportunities } from "@/lib/ability/dimensions";
import { dueForReview } from "@/lib/plan/adaptive";

interface Message {
  id: string;
  category: "学习" | "系统";
  title: string;
  body: string;
  at: string;
}

export default function MessagesPage() {
  const { taskResults, imports, weeklyReview, notifications, notificationState, attemptRecords, profile, membership, dismissNotification } = useProfileStore();
  const [filter, setFilter] = useState<"全部" | "学习" | "系统">("全部");
  // F0357：后台消息模板参与文案渲染，未配置时用内置文案
  const [templates, setTemplates] = useState<Array<{ kind: string; template: string }>>([]);
  // F0316：系统消息的真实数据源——已发布公告与后台维护的考试节点
  const [notices, setNotices] = useState<Array<{ id: string; title: string; body: string; publishedAt?: string | null }>>([]);
  const [examNodes, setExamNodes] = useState<Array<{ id: number; exam_name: string; kind: string; date: string }>>([]);
  useEffect(() => {
    void fetch("/api/operations/public")
      .then((r) => r.json())
      .then((d: { ok: boolean; templates?: Array<{ kind: string; template: string }>; notices?: Array<{ id: string; title: string; body: string; publishedAt?: string | null }> }) => {
        if (!d.ok) return;
        setTemplates(d.templates ?? []);
        setNotices(d.notices ?? []);
      })
      .catch(() => undefined);
    void fetch("/api/admin/exam-nodes")
      .then((r) => r.json())
      .then((d: { ok: boolean; rows?: Array<{ id: number; exam_name: string; kind: string; date: string }> }) => setExamNodes(d.ok ? d.rows ?? [] : []))
      .catch(() => undefined);
  }, []);

  const messages = useMemo<Message[]>(() => {
    const out: Message[] = [];
    const prefs = {
      enabled: notifications.proactive,
      task: notifications.taskReminder,
      exam: notifications.examDeadline,
      review: notifications.review,
      progress: notifications.progress,
      quietHours: { start: 23, end: 7 },
      ignoredStreak: notificationState.ignoredStreak,
    };
    const ability = computeAbilityDimensions(attemptRecords);
    // F0091：曾掌握（同知识点累计答对 ≥2 次）才算「复习机会」，与从未掌握区分开
    const correctCounts = new Map<string, number>();
    for (const record of attemptRecords) {
      if (record.correct) correctCounts.set(record.knowledgePoint, (correctCounts.get(record.knowledgePoint) ?? 0) + 1);
    }
    const mastered = new Set([...correctCounts.entries()].filter(([, count]) => count >= 2).map(([point]) => point));
    const due = dueForReview(ability.forgetting, mastered);
    const reviewChances = reviewOpportunities(ability.forgetting, mastered);
    // F0317 学习消息：从真实数据派生
    const doneCount = taskResults.length;
    if (doneCount > 0) {
      out.push({
        id: "m-tasks",
        category: "学习",
        title: `本周已完成 ${doneCount} 项处方任务`,
        body: "完成质比量重要。回进展页看看这些训练带来的变化。",
        at: new Date().toISOString(),
      });
    }
    if (imports.length > 0) {
      const latest = imports[imports.length - 1]!;
      out.push({
        id: "m-import",
        category: "学习",
        title: `已记录一次成绩（${latest.examLabel}）`,
        body: "诊断会随这次成绩自动更新；如结论有明显变化，今日焦点会重新排序。",
        at: latest.importedAt,
      });
    }
    if (weeklyReview?.status === "待确认") {
      out.push({
        id: "m-weekly",
        category: "学习",
        title: "本周复盘已生成，等你确认下周重点",
        body: "复盘不是评价你努不努力，而是评价策略是否有效。",
        at: new Date().toISOString(),
      });
    }
    // F0316 系统消息：来自后台已发布公告 + 真实考试节点，而不是单条静态文案
    for (const notice of notices) {
      out.push({ id: `notice-${notice.id}`, category: "系统", title: notice.title, body: notice.body, at: notice.publishedAt ?? new Date().toISOString() });
    }
    if (examNodes.length > 0) {
      const upcoming = buildExamNodeNotifications(examNodes);
      for (const node of upcoming) {
        if (shouldNotify(prefs, "考试节点").allowed) {
          out.push({ id: node.id, category: "系统", title: node.title, body: node.body, at: node.at });
        }
      }
    }
    out.push({
      id: "m-sys-1",
      category: "系统",
      title: "提醒偏好已生效",
      body: `当前提醒时段 ${notifications.window}；只在有行动价值时提醒。`,
      at: new Date().toISOString(),
    });
    // F0314 会员到期提醒：由真实到期日推导，7 天内才提醒；到期后提示已失效
    if (membership.expiresAt) {
      const daysLeft = Math.ceil((new Date(membership.expiresAt).getTime() - Date.now()) / 86_400_000);
      if (daysLeft <= 7) {
        out.push({
          id: `m-membership-${membership.expiresAt.slice(0, 10)}`,
          category: "系统",
          title: daysLeft >= 0 ? `会员将在 ${daysLeft} 天后到期` : "会员已到期",
          body: daysLeft >= 0
            ? `到期日 ${membership.expiresAt.slice(0, 10)}。到期后训练与错题不受影响，AI 额度会回到免费档。`
            : `到期日 ${membership.expiresAt.slice(0, 10)}。已恢复免费档额度；历史数据完整保留。`,
          at: new Date().toISOString(),
        });
      }
    }
    // F0292 遗忘风险复习到期提醒
    if (shouldNotify(prefs, "复习到期").allowed) {
      for (const n of buildReviewNotifications(due, new Date(), templates)) {
        out.push({ id: n.id, category: "学习", title: n.title, body: n.body, at: n.at });
      }
      // F0091：曾掌握又出现遗忘风险的知识点，单独提示「捡回来」的收益更高
      if (reviewChances.length > 0) {
        out.push({
          id: `review-chance-${reviewChances.slice(0, 3).join("-")}`,
          category: "学习",
          title: `${reviewChances.length} 个曾掌握的知识点出现遗忘风险`,
          body: `${reviewChances.slice(0, 3).join("、")}：你以前做对过，捡回来比学新知识点更快。`,
          at: new Date().toISOString(),
        });
      }
    }
    // F0291 考试节点提醒：仅在行动窗口内生成
    if (profile.goal?.examDate) {
      const nodeMessages = buildExamNodeNotifications(
        // 用负 id 与后台节点（正整数 id）区分，避免 exam-1 键冲突导致两条消息被一起忽略
        [{ id: -1, exam_name: profile.goal.examName, kind: "笔试", date: profile.goal.examDate }],
      );
      for (const n of nodeMessages) {
        if (shouldNotify(prefs, "考试节点").allowed) {
          out.push({ id: n.id, category: "系统", title: n.title, body: n.body, at: n.at });
        }
      }
    }
    // F0299：仅使用题级作答的前后正确率差，不把任务完成数误称为进步。
    const measuredProgress = trainingAccuracyProgress(attemptRecords);
    const progress = measuredProgress
      ? progressNotification(measuredProgress.delta, measuredProgress.metric, new Date(), templates)
      : null;
    if (progress && shouldNotify(prefs, "进步").allowed) {
      out.push({ id: progress.id, category: "学习", title: progress.title, body: progress.body, at: progress.at });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [taskResults.length, imports, weeklyReview, notifications, notificationState.ignoredStreak, attemptRecords, profile.goal, membership.expiresAt, templates, notices, examNodes]);

  const visible = messages.filter((m) => !notificationState.dismissed.includes(m.id) && (filter === "全部" || m.category === filter));

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">消息</h1>
      <nav aria-label="消息筛选" className="mt-lg flex gap-sm">
        {(["全部", "学习", "系统"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-md py-sm text-label-md ${
              filter === f ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="mt-xl">
          <EmptyState
            why="这里静悄悄的。"
            action="我们只在有行动价值时发消息——不为拉活跃度打扰你。"
          />
        </div>
      ) : (
        <ul className="mt-lg space-y-md">
          {visible.map((m) => (
            <li key={m.id}>
              <Card>
                <div className="flex items-center justify-between gap-sm">
                  <Chip tone={m.category === "学习" ? "insight" : "neutral"}>{m.category}</Chip>
                  <span className="text-caption text-muted-soft">
                    {new Date(m.at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <p className="mt-sm text-body-md text-ink">{m.title}</p>
                <p className="mt-xs text-body-sm text-body">{m.body}</p>
                {m.category === "学习" ? <button type="button" onClick={() => dismissNotification(m.id)} className="mt-xs text-caption text-muted underline-offset-2 hover:underline">本次先忽略</button> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
