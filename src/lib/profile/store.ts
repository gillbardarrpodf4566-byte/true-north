"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Agreements,
  ExamGoal,
  LearningConditions,
  ModuleId,
  Profile,
} from "./types";
import type { Diagnosis } from "@/lib/diagnosis/engine";
import type { Prescription } from "@/lib/prescription/engine";
import type { WrongBookEntry } from "@/lib/errorcause/engine";
import { updateEssayAbility } from "@/lib/essay/rewrite";
import type { EssaySubmission } from "@/lib/essay/types";
import type { AttemptRecord } from "@/lib/ability/dimensions";

/**
 * 隔离本地持久化：同一浏览器不同账号不能共享学习、错题、选岗和隐私数据。
 * 旧版单键 `jianan-profile` 仅在访客首次加载时迁移为 guest，避免静默泄露给登录用户。
 */
const ACTIVE_PROFILE_NAMESPACE = "jianan-active-profile";
const LEGACY_PROFILE_KEY = "jianan-profile";
const PROFILE_KEY_PREFIX = "jianan-profile:";

function activeProfileStorageKey(): string {
  if (typeof window === "undefined") return `${PROFILE_KEY_PREFIX}guest`;
  return `${PROFILE_KEY_PREFIX}${localStorage.getItem(ACTIVE_PROFILE_NAMESPACE) ?? "guest"}`;
}

const profileStorage = {
  getItem: (): string | null => {
    const key = activeProfileStorageKey();
    let value = localStorage.getItem(key);
    if (value == null && key === `${PROFILE_KEY_PREFIX}guest`) {
      const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
      if (legacy != null) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
        value = legacy;
      }
    }
    return value;
  },
  setItem: (name: string, value: string): void => {
    void name;
    localStorage.setItem(activeProfileStorageKey(), value);
  },
  removeItem: (): void => localStorage.removeItem(activeProfileStorageKey()),
};

/** 在认证身份切换前调用；随后完整页面重载，Zustand 会从对应命名空间重新 hydrate。 */
export function selectProfileNamespace(namespace: string): void {
  if (typeof window !== "undefined") localStorage.setItem(ACTIVE_PROFILE_NAMESPACE, namespace);
}

/**
 * 删除账号时清空当前命名空间的持久化快照（F0332/F0334）。
 * 只删当前激活空间，不切换空间，避免误删其他账号或访客数据。
 */
export function clearActiveProfileNamespace(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(activeProfileStorageKey());
}

/** 未完成训练的恢复快照；完成后必须移除，避免复用过期的题目状态。 */
export interface TrainingSessionDraft {
  phase: "running" | "paused";
  /** 以题目 ID 恢复，而不是易受题库变化影响的数组下标。 */
  currentQuestionId: string | null;
  /** 当前尚未确认题目的累计可见作答时间（秒）。 */
  currentQuestionSeconds: number;
  selectedChoice: number | null;
  submitted: boolean;
  answerChanges: Record<string, number>;
  savedAt: string;
}

/** 一次训练会话（CL-03 作答轨迹） */
export interface TrainingSession {
  id: string;
  /** 关联处方任务；自由训练为 null */
  taskId: string | null;
  moduleId: string;
  questionIds: string[];
  /** 已确认作答或跳过的题；未提交选择保留在 draft。 */
  answers: Record<string, { choice: number | null; seconds: number; skipped: boolean }>;
  startedAt: string;
  finishedAt: string | null;
  /** 会话总用时（秒） */
  totalSeconds: number;
  /** 未完成时用于恢复，完成记录不保留。 */
  draft?: TrainingSessionDraft;
  /** 关联的错题复测条目（复测会话结束时回写验证状态） */
  wrongIds?: string[];
}

/** 一次已确认入库的模考成绩（数据接入与建档 产物） */
export interface ScoreImport {
  id: string;
  /** F0047 来源标签 */
  source: "截图" | "手工录入" | "系统训练";
  platform: string;
  examLabel: string;
  importedAt: string;
  totalScore: number | null;
  /** 原始证据与解析版本关联（F0048） */
  sourceRef?: { kind: "screenshot" | "external"; rawEvidence: string; parserVersion?: string };
  /** 模块级数据；缺失字段为 null（F0036 禁止编造） */
  modules: Array<{
    id: ModuleId;
    score: number | null;
    questions: number | null;
    correct: number | null;
    /** 秒/题 */
    secondsPerQuestion: number | null;
  }>;
}

export interface BaselineSnapshot {
  computedAt: string;
  /** 每模块：滚动正确率 + 置信区间 + 速度 + 样本量 */
  modules: Array<{
    id: ModuleId;
    accuracy: number | null;
    accuracyLow: number | null;
    accuracyHigh: number | null;
    secondsPerQuestion: number | null;
    sampleQuestions: number;
  }>;
  /** F0069 基线可信等级 */
  confidence: "冷启动" | "低" | "中" | "高";
  dataNote: string;
}

interface ProfileState {
  profile: Profile;
  imports: ScoreImport[];
  baseline: BaselineSnapshot | null;
  diagnosis: Diagnosis | null;
  diagnosisHistory: Array<{ generatedAt: string; topModuleId: string | null; provisional: boolean }>;
  prescription: Prescription | null;
  /** 任务完成记录（F0115：记录结果而非仅勾选） */
  taskResults: TaskResult[];
  /** 训练会话（作答轨迹持久化：禁止中断丢失已作答） */
  sessions: TrainingSession[];
  /** V1 高级能力画像的题级作答轨迹（F0071/F0074/F0075/F0076/F0131） */
  attemptRecords: AttemptRecord[];
  /** F0079 用户对画像/薄弱项的纠正，系统保留用户说法不静默覆盖 */
  profileCorrections: Array<{ scope: "题型" | "知识点" | "错因"; key: string; userSays: string; at: string }>;
  /** 错题本（F0149 答错自动入库） */
  wrongBook: WrongBookEntry[];
  /** 今日临时可用时间覆盖（F0054） */
  todayMinutesOverride: number | null;
  /** 周复盘（状态机：待生成→待确认→已重排；禁止静默改变下周目标） */
  weeklyReview: WeeklyReview | null;
  /** F0284 历史周复盘：保留已确认的周，用于计划与结果的前后对比 */
  weeklyReviewHistory: WeeklyReview[];
  /** AI 对话续接（F0174：同一学习上下文的最近对话） */
  coachHistory: Array<{ id: string; role: "user" | "coach"; text: string; context: string; at: string }>;
  /** AI 回答反馈与举报（F0178/F0179/F0319） */
  aiFeedback: Array<{
    id: string;
    target: string;
    helpful: boolean | null;
    reported: boolean;
    reason: string;
    at: string;
  }>;
  /** 会员（CL-09 最小闭环：额度 + mock 订单 F0307–F0312） */
  membership: Membership;
  /** 收藏的题（F0134） */
  favorites: string[];
  /** 选岗（V1 CL-08）：资格建档与收藏（F0257/F0273） */
  jobProfile: import("@/lib/jobs/types").JobSeekerProfile | null;
  jobFavorites: string[];
  /** 申论作答与批改（V1 CL-05） */
  essaySubmissions: EssaySubmission[];
  essayGrades: Record<string, import("@/lib/essay/types").EssayGrade>;
  essayAbilities: import("@/lib/essay/types").EssayAbility[];
  /** 延后的处方任务：date → taskIds（F0117） */
  postponedTasks: Record<string, string[]>;
  /** 未完成原因与V1动态计划变更（F0116/F0121） */
  taskAdjustments: Array<{ taskId: string; reason: "时间不足" | "太难" | "计划不合理" | "其他"; at: string; change: string }>;
  /** 关注库：高耗时/低信心但答对的题（F0150） */
  watchlist: string[];
  /** F0226 申论专项处方：用户确认后进入今日可执行任务 */
  essayPlanItems: Array<{ id: string; title: string; minutes: number; successCriteria: string; addedAt: string; doneAt: string | null }>;
  /** F0196/F0197 下场模考的模块顺序预算与待验证策略实验 */
  mockPlan: {
    budgets: Array<{ moduleId: string; suggestedOrder: number; suggestedMinutes: number }>;
    experiment: { hypothesis: string; metric: string; recordedAt: string; baselineScore: number | null } | null;
  } | null;
  /** 通知偏好（F0290/F0324/F0294） */
  notifications: { taskReminder: boolean; diagnosisReady: boolean; examDeadline: boolean; review: boolean; progress: boolean; window: string; proactive: boolean };
  /** F0293 连续忽略降频、F0316/0317 消息已读状态 */
  notificationState: { ignoredStreak: number; dismissed: string[] };
  /** 学习偏好与教练风格（F0023/F0025/F0026/F0325） */
  learningPreferences: {
    resources: string[];
    mode: "短练" | "长练" | "混合";
    content: "文字" | "互动";
    coachStyle: "直接" | "温和" | "苏格拉底式";
    proactive: boolean;
  };
  /** 隐私策略（F0328/F0329） */
  privacy: { screenshotPolicy: "识别后保留" | "确认后自动删除"; personalization: boolean };
  /** 功能反馈（F0318） */
  feedbacks: Array<{ id: string; type: "问题" | "建议" | "内容纠错"; text: string; hasScreenshot: boolean; at: string }>;
  /** Horizon Reveal 当天是否已播放（§7.4/§8.9 一天只完整执行一次） */
  lastRevealDate: string | null;
  setAgreements: (a: Agreements) => void;
  setGoal: (g: ExamGoal) => void;
  setConditions: (c: LearningConditions) => void;
  setNickname: (n: string) => void;
  setProfile: (p: Partial<Profile>) => void;
  addImport: (i: ScoreImport) => void;
  upsertImport: (i: ScoreImport) => void;
  setBaseline: (b: BaselineSnapshot) => void;
  setDiagnosis: (d: Diagnosis) => void;
  setPrescription: (p: Prescription) => void;
  addTaskResult: (r: TaskResult) => void;
  upsertSession: (s: TrainingSession) => void;
  addAttemptRecords: (records: AttemptRecord[]) => void;
  addProfileCorrection: (c: { scope: "题型" | "知识点" | "错因"; key: string; userSays: string }) => void;
  addWrongEntries: (e: WrongBookEntry[]) => void;
  updateWrongEntry: (questionId: string, patch: Partial<WrongBookEntry>) => void;
  setTodayMinutesOverride: (m: number | null) => void;
  setWeeklyReview: (w: WeeklyReview) => void;
  addCoachTurns: (turns: Array<{ id: string; role: "user" | "coach"; text: string; context: string; at: string }>) => void;
  addAiFeedback: (f: { target: string; helpful: boolean | null; reported: boolean; reason: string }) => void;
  purchaseMembership: (plan: Membership["plan"], ok: boolean) => void;
  restorePurchase: () => void;
  /** F0313：记录一次 AI 额度消耗（批改/教练等真实调用后） */
  consumeAiQuota: () => void;
  requestRefund: (channel: Membership["refunds"][number]["channel"], reason: string) => void;
  toggleFavorite: (questionId: string) => void;
  setJobProfile: (p: import("@/lib/jobs/types").JobSeekerProfile) => void;
  toggleJobFavorite: (qid: string) => void;
  addEssaySubmission: (
    s: import("@/lib/essay/types").EssaySubmission,
    essayType: import("@/lib/essay/types").EssayType,
    grade: import("@/lib/essay/types").EssayGrade,
  ) => void;
  postponeTask: (date: string, taskId: string) => void;
  addTaskAdjustment: (a: { taskId: string; reason: "时间不足" | "太难" | "计划不合理" | "其他"; change: string }) => void;
  addEssayPlanItem: (item: { title: string; minutes: number; successCriteria: string }) => void;
  setMockPlan: (plan: NonNullable<ProfileState["mockPlan"]>) => void;
  completeEssayPlanItem: (id: string) => void;
  toggleWatchlist: (questionId: string) => void;
  setNotifications: (n: Partial<ProfileState["notifications"]>) => void;
  dismissNotification: (id: string) => void;
  setLearningPreferences: (p: Partial<ProfileState["learningPreferences"]>) => void;
  setPrivacy: (p: Partial<ProfileState["privacy"]>) => void;
  addFeedback: (f: { type: "问题" | "建议" | "内容纠错"; text: string; hasScreenshot: boolean }) => void;
  markRevealed: (date: string) => void;
  reset: () => void;
}

export interface WeeklyReview {
  weekKey: string;
  /** 待确认 | 已重排 */
  status: "待确认" | "已重排";
  conclusion: string;
  effective: string[];
  wasted: string[];
  discoveries: string[];
  /** 下周 1–3 个重点（用户确认后才生效，禁止静默改变下周目标） */
  nextPriorities: string[];
  /** F0287 用户反思：本周感受/困难/时间变化 */
  reflection?: string;
  confirmedAt: string | null;
}

export interface Membership {
  plan: "free" | "pro-monthly" | "pro-yearly";
  /** 免费版每周诊断生成额度 */
  diagnosisQuota: number;
  usedDiagnosis: number;
  /** V1 F0313：AI/批改额度（mock） */
  aiQuota: number;
  usedAi: number;
  /** V1 F0314：到期日 */
  expiresAt: string | null;
  orders: Array<{ id: string; plan: Membership["plan"]; status: "处理中" | "成功" | "失败"; at: string }>;
  refunds: Array<{ id: string; channel: "App Store" | "微信" | "Apple"; reason: string; status: "已提交" | "已完成"; at: string }>;
}

/** 任务完成结果（F0115） */
export interface TaskResult {
  taskId: string;
  completedAt: string;
  /** 实际用时（分钟） */
  minutes: number;
  /** 完成题数与正确数；复盘类任务为 null */
  questions: number | null;
  correct: number | null;
  /** 是否达成成功标准 */
  metCriteria: boolean;
}

const emptyProfile: Profile = {
  nickname: "",
  goal: null,
  conditions: null,
  agreements: null,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      imports: [],
      baseline: null,
      diagnosis: null,
      diagnosisHistory: [],
      prescription: null,
      taskResults: [],
      sessions: [],
      attemptRecords: [],
      profileCorrections: [],
      wrongBook: [],
      todayMinutesOverride: null,
      weeklyReview: null,
      weeklyReviewHistory: [],
      coachHistory: [],
      aiFeedback: [],
      membership: { plan: "free", diagnosisQuota: 3, usedDiagnosis: 0, aiQuota: 20, usedAi: 0, expiresAt: null, orders: [], refunds: [] },
      favorites: [],
      jobProfile: null,
      jobFavorites: [],
      essaySubmissions: [],
      essayGrades: {},
      essayAbilities: [],
      postponedTasks: {},
      taskAdjustments: [],
      watchlist: [],
      essayPlanItems: [],
      mockPlan: null,
      notifications: { taskReminder: true, diagnosisReady: true, examDeadline: true, review: true, progress: true, window: "20:00", proactive: true },
      notificationState: { ignoredStreak: 0, dismissed: [] },
      learningPreferences: { resources: [], mode: "混合", content: "文字", coachStyle: "温和", proactive: true },
      privacy: { screenshotPolicy: "识别后保留", personalization: true },
      feedbacks: [],
      lastRevealDate: null,
      setAgreements: (agreements) =>
        set((s) => ({ profile: { ...s.profile, agreements } })),
      setGoal: (goal) => set((s) => ({ profile: { ...s.profile, goal } })),
      setConditions: (conditions) =>
        set((s) => ({ profile: { ...s.profile, conditions } })),
      setNickname: (nickname) => set((s) => ({ profile: { ...s.profile, nickname } })),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      addImport: (imp) => set((s) => {
        const rest = s.imports.filter((existing) => existing.id !== imp.id);
        return { imports: [...rest, imp] };
      }),
      upsertImport: (imp) =>
        set((s) => {
          const rest = s.imports.filter((x) => x.id !== imp.id);
          return { imports: [...rest, imp] };
        }),
      setBaseline: (baseline) => set({ baseline }),
      setDiagnosis: (diagnosis) =>
        set((s) => ({
          diagnosis,
          diagnosisHistory: [
            { generatedAt: diagnosis.generatedAt, topModuleId: diagnosis.opportunities[0]?.moduleId ?? null, provisional: diagnosis.provisional },
            ...s.diagnosisHistory.filter((h) => h.generatedAt !== diagnosis.generatedAt),
          ].slice(0, 20),
        })),
      setPrescription: (prescription) => set({ prescription }),
      addTaskResult: (r) => set((s) => ({ taskResults: [...s.taskResults, r] })),
      upsertSession: (session) =>
        set((s) => {
          const rest = s.sessions.filter((x) => x.id !== session.id);
          return { sessions: [...rest, session] };
        }),
      addAttemptRecords: (records) => set((s) => ({ attemptRecords: [...s.attemptRecords, ...records].slice(-1000) })),
      addProfileCorrection: (c) => set((s) => ({ profileCorrections: [...s.profileCorrections, { ...c, at: new Date().toISOString() }] })),
      addWrongEntries: (entries) =>
        set((s) => {
          const known = new Set(s.wrongBook.map((w) => w.questionId));
          const fresh = entries.filter((e) => !known.has(e.questionId));
          return { wrongBook: [...s.wrongBook, ...fresh] };
        }),
      updateWrongEntry: (questionId, patch) =>
        set((s) => ({
          wrongBook: s.wrongBook.map((w) =>
            w.questionId === questionId ? { ...w, ...patch } : w,
          ),
        })),
      setTodayMinutesOverride: (todayMinutesOverride) => set({ todayMinutesOverride }),
      // F0284：已确认的周复盘归档，供下一周做「计划 vs 结果」对比；同一周只保留一条。
      setWeeklyReview: (weeklyReview) =>
        set((s) => {
          if (weeklyReview.status !== "已重排") return { weeklyReview };
          const rest = s.weeklyReviewHistory.filter((item) => item.weekKey !== weeklyReview.weekKey);
          return { weeklyReview, weeklyReviewHistory: [...rest, weeklyReview].slice(-12) };
        }),
      addCoachTurns: (turns) => set((s) => ({ coachHistory: [...s.coachHistory, ...turns].slice(-40) })),
      addAiFeedback: (f) =>
        set((s) => ({
          aiFeedback: [
            ...s.aiFeedback,
            { id: `fb-${Date.now()}`, at: new Date().toISOString(), ...f },
          ],
        })),
      purchaseMembership: (plan, ok) =>
        set((s) => ({
          membership: {
            ...s.membership,
            plan: ok ? plan : s.membership.plan,
            aiQuota: ok ? 9999 : s.membership.aiQuota,
            expiresAt: ok ? new Date(Date.now() + (plan === "pro-yearly" ? 365 : 30) * 86_400_000).toISOString() : s.membership.expiresAt,
            orders: [
              ...s.membership.orders,
              {
                id: `ord-${Date.now()}`,
                plan,
                status: ok ? "成功" : "失败",
                at: new Date().toISOString(),
              },
            ],
          },
        })),
      /**
       * F0311 恢复购买：幂等。以成功订单本身的时间与套餐推导到期日，
       * 重复点击得到同一结果，不会反复延长权益；年度套餐按 365 天恢复。
       */
      restorePurchase: () =>
        set((s) => {
          const last = [...s.membership.orders].reverse().find((o) => o.status === "成功");
          if (!last) return {} as Partial<ProfileState>;
          const days = last.plan === "pro-yearly" ? 365 : 30;
          const expiresAt = new Date(new Date(last.at).getTime() + days * 86_400_000).toISOString();
          if (s.membership.plan === last.plan && s.membership.expiresAt === expiresAt) {
            return {} as Partial<ProfileState>;
          }
          return { membership: { ...s.membership, plan: last.plan, aiQuota: 9999, expiresAt } };
        }),
      consumeAiQuota: () =>
        set((s) => ({
          membership: { ...s.membership, usedAi: Math.min(s.membership.aiQuota, s.membership.usedAi + 1) },
        })),
      requestRefund: (channel, reason) =>
        set((s) => ({
          membership: {
            ...s.membership,
            refunds: [...s.membership.refunds, { id: `refund-${Date.now()}`, channel, reason, status: "已提交", at: new Date().toISOString() }],
          },
        })),
      toggleFavorite: (questionId) =>
        set((s) => ({
          favorites: s.favorites.includes(questionId)
            ? s.favorites.filter((f) => f !== questionId)
            : [...s.favorites, questionId],
        })),
      setJobProfile: (jobProfile) => set({ jobProfile }),
      toggleJobFavorite: (qid) =>
        set((s) => ({
          jobFavorites: s.jobFavorites.includes(qid)
            ? s.jobFavorites.filter((f) => f !== qid)
            : [...s.jobFavorites, qid],
        })),
      addEssaySubmission: (sub, essayType, grade) =>
        set((s) => {
          const prevAbility = s.essayAbilities.find((a) => a.type === essayType) ?? null;
          const ability = updateEssayAbility(prevAbility, essayType, grade);
          const rest = s.essayAbilities.filter((a) => a.type !== essayType);
          return {
            essaySubmissions: [...s.essaySubmissions, sub],
            essayGrades: { ...s.essayGrades, [sub.id]: grade },
            essayAbilities: [...rest, ability],
          };
        }),
      postponeTask: (date, taskId) =>
        set((s) => {
          const list = s.postponedTasks[date] ?? [];
          if (list.includes(taskId)) return {} as Partial<ProfileState>;
          return { postponedTasks: { ...s.postponedTasks, [date]: [...list, taskId] } };
        }),
      addTaskAdjustment: (a) => set((s) => ({ taskAdjustments: [...s.taskAdjustments, { ...a, at: new Date().toISOString() }] })),
      setMockPlan: (mockPlan) => set({ mockPlan }),
      addEssayPlanItem: (item) =>
        set((s) => {
          // 同标题只保留一条未完成项，重复点击不产生重复任务。
          if (s.essayPlanItems.some((existing) => existing.title === item.title && existing.doneAt == null)) {
            return {} as Partial<ProfileState>;
          }
          return {
            essayPlanItems: [
              ...s.essayPlanItems,
              { id: `essay-plan-${item.title}`, ...item, addedAt: new Date().toISOString(), doneAt: null },
            ],
          };
        }),
      completeEssayPlanItem: (id) =>
        set((s) => ({
          essayPlanItems: s.essayPlanItems.map((item) =>
            item.id === id && item.doneAt == null ? { ...item, doneAt: new Date().toISOString() } : item,
          ),
        })),
      toggleWatchlist: (questionId) => set((s) => ({ watchlist: s.watchlist.includes(questionId) ? s.watchlist.filter((id) => id !== questionId) : [...s.watchlist, questionId] })),
      setNotifications: (n) => set((s) => ({ notifications: { ...s.notifications, ...n } })),
      dismissNotification: (id) => set((s) => ({
        notificationState: {
          ignoredStreak: s.notificationState.ignoredStreak + 1,
          dismissed: [...s.notificationState.dismissed, id].slice(-200),
        },
      })),
      setLearningPreferences: (p) => set((s) => ({ learningPreferences: { ...s.learningPreferences, ...p } })),
      setPrivacy: (p) => set((s) => ({ privacy: { ...s.privacy, ...p } })),
      addFeedback: (f) =>
        set((s) => ({
          feedbacks: [
            ...s.feedbacks,
            { id: `fdb-${Date.now()}`, at: new Date().toISOString(), ...f },
          ],
        })),
      markRevealed: (lastRevealDate) => set({ lastRevealDate }),
      reset: () =>
        set({
          profile: emptyProfile,
          imports: [],
          baseline: null,
          diagnosis: null,
          diagnosisHistory: [],
          prescription: null,
          taskResults: [],
          sessions: [],
          attemptRecords: [],
          profileCorrections: [],
          wrongBook: [],
          todayMinutesOverride: null,
          weeklyReview: null,
          weeklyReviewHistory: [],
          coachHistory: [],
          aiFeedback: [],
          membership: { plan: "free", diagnosisQuota: 3, usedDiagnosis: 0, aiQuota: 20, usedAi: 0, expiresAt: null, orders: [], refunds: [] },
          favorites: [],
          jobProfile: null,
          jobFavorites: [],
          essaySubmissions: [],
          essayGrades: {},
          essayAbilities: [],
          postponedTasks: {},
          taskAdjustments: [],
          watchlist: [],
          essayPlanItems: [],
          mockPlan: null,
          notifications: { taskReminder: true, diagnosisReady: true, examDeadline: true, review: true, progress: true, window: "20:00", proactive: true },
      notificationState: { ignoredStreak: 0, dismissed: [] },
          learningPreferences: { resources: [], mode: "混合", content: "文字", coachStyle: "温和", proactive: true },
          privacy: { screenshotPolicy: "识别后保留", personalization: true },
          feedbacks: [],
          lastRevealDate: null,
        }),
    }),
    {
      name: "jianan-profile",
      storage: createJSONStorage(() => profileStorage),
      version: 2,
      // V1 状态迁移：旧 localStorage 快照缺少画像/选岗/申论/额度等字段时，以当前默认值补齐。
      merge: (persisted, current) => {
        const old = (persisted ?? {}) as Partial<ProfileState>;
        return {
          ...current,
          ...old,
          profile: { ...current.profile, ...(old.profile ?? {}) },
          membership: { ...current.membership, ...(old.membership ?? {}) },
          notifications: { ...current.notifications, ...(old.notifications ?? {}) },
          learningPreferences: { ...current.learningPreferences, ...(old.learningPreferences ?? {}) },
          privacy: { ...current.privacy, ...(old.privacy ?? {}) },
          favorites: old.favorites ?? current.favorites,
          jobFavorites: old.jobFavorites ?? current.jobFavorites,
          attemptRecords: old.attemptRecords ?? current.attemptRecords,
          profileCorrections: old.profileCorrections ?? current.profileCorrections,
          coachHistory: old.coachHistory ?? current.coachHistory,
          essaySubmissions: old.essaySubmissions ?? current.essaySubmissions,
          essayGrades: old.essayGrades ?? current.essayGrades,
          essayAbilities: old.essayAbilities ?? current.essayAbilities,
          diagnosisHistory: old.diagnosisHistory ?? current.diagnosisHistory,
          taskAdjustments: old.taskAdjustments ?? current.taskAdjustments,
          watchlist: old.watchlist ?? current.watchlist,
          weeklyReviewHistory: old.weeklyReviewHistory ?? current.weeklyReviewHistory,
          essayPlanItems: old.essayPlanItems ?? current.essayPlanItems,
          mockPlan: old.mockPlan ?? current.mockPlan,
        };
      },
    },
  ),
);
