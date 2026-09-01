/**
 * V1 主动支持与消息策略（F0291–F0299 / F0316–F0317）。
 * 只在有行动价值时提醒；连续忽略自动降频；提示可关闭。
 */
import type { AttemptRecord } from "@/lib/ability/dimensions";

export interface NotificationEvent {
  id: string;
  kind: "考试节点" | "复习到期" | "任务" | "进步" | "系统";
  title: string;
  body: string;
  at: string;
  actionHref: string;
  read: boolean;
}

export interface NotificationPrefs {
  enabled: boolean;
  task: boolean;
  exam: boolean;
  review: boolean;
  progress: boolean;
  quietHours: { start: number; end: number };
  /** 连续忽略次数，决定降频（F0293） */
  ignoredStreak: number;
}

/** F0293：忽略 ≥3 次后，每次最多发一条；≥7 次暂停一周 */
export function shouldNotify(
  pref: NotificationPrefs,
  kind: NotificationEvent["kind"],
  now = new Date(),
): { allowed: boolean; reason: string } {
  if (!pref.enabled) return { allowed: false, reason: "你已关闭主动支持。" };
  if (pref.ignoredStreak >= 7) return { allowed: false, reason: "连续忽略较多，已自动暂停一周。" };
  if (kind === "任务" && !pref.task) return { allowed: false, reason: "已关闭任务提醒。" };
  if (kind === "考试节点" && !pref.exam) return { allowed: false, reason: "已关闭考试节点提醒。" };
  if (kind === "复习到期" && !pref.review) return { allowed: false, reason: "已关闭复习到期提醒。" };
  if (kind === "进步" && !pref.progress) return { allowed: false, reason: "已关闭进步提醒。" };
  const h = now.getHours();
  const inQuiet = pref.quietHours.start < pref.quietHours.end
    ? h >= pref.quietHours.start && h < pref.quietHours.end
    : h >= pref.quietHours.start || h < pref.quietHours.end;
  if (inQuiet) return { allowed: false, reason: "当前处于免打扰时段。" };
  return { allowed: true, reason: "有行动价值，可以提醒。" };
}

export function buildExamNodeNotifications(
  nodes: Array<{ id: number; exam_name: string; kind: string; date: string }>,
  now = new Date(),
): NotificationEvent[] {
  return nodes
    .filter((n) => {
      const days = Math.ceil((new Date(n.date).getTime() - now.getTime()) / 86_400_000);
      return days >= 0 && days <= 14;
    })
    .map((n) => ({
      id: `exam-${n.id}`,
      kind: "考试节点" as const,
      title: `${n.exam_name} · ${n.kind}即将开始`,
      body: `${n.date} 是「${n.kind}」节点，请提前准备。`,
      at: now.toISOString(),
      actionHref: "/jobs",
      read: false,
    }));
}

export function buildReviewNotifications(
  due: Array<{ knowledgePoint: string; reason: string }>,
  now = new Date(),
): NotificationEvent[] {
  return due.slice(0, 3).map((d, i) => ({
    id: `review-${i}-${d.knowledgePoint}`,
    kind: "复习到期" as const,
    title: `「${d.knowledgePoint}」到复测时间了`,
    body: d.reason,
    at: now.toISOString(),
    actionHref: "/train/wrongbook",
    read: false,
  }));
}

/**
 * F0299：以同一用户已完成的真实题级记录计算进步。
 * 样本不足时不推送；任务完成数不是正确率提升的替代指标。
 */
export function trainingAccuracyProgress(
  attempts: AttemptRecord[],
  sampleSize = 5,
): { delta: number; metric: string } | null {
  if (attempts.length < sampleSize * 2) return null;
  const ordered = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  const baseline = ordered.slice(0, sampleSize);
  const recent = ordered.slice(-sampleSize);
  const accuracy = (records: AttemptRecord[]): number =>
    records.filter((record) => record.correct).length / records.length;
  const delta = Math.round((accuracy(recent) - accuracy(baseline)) * 1_000) / 10;
  return delta > 0 ? { delta, metric: `近 ${sampleSize} 题正确率` } : null;
}

/** F0299 进步提醒：必须带真实变化，不发送空泛鼓励 */
export function progressNotification(delta: number, metric: string, now = new Date()): NotificationEvent | null {
  if (delta <= 0) return null;
  return {
    id: `progress-${now.getTime()}`,
    kind: "进步",
    title: `${metric}有稳定进步`,
    body: `最近记录比你的个人基线高 ${delta} 个百分点，这个变化值得保留。`,
    at: now.toISOString(),
    actionHref: "/progress",
    read: false,
  };
}

