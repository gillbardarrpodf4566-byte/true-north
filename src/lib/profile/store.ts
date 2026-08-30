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

/** 一次训练会话（CL-03 作答轨迹） */
export interface TrainingSession {
  id: string;
  /** 关联处方任务；自由训练为 null */
  taskId: string | null;
  moduleId: string;
  questionIds: string[];
  answers: Record<string, { choice: number | null; seconds: number; skipped: boolean }>;
  startedAt: string;
  finishedAt: string | null;
  /** 会话总用时（秒） */
  totalSeconds: number;
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
  prescription: Prescription | null;
  /** 任务完成记录（F0115：记录结果而非仅勾选） */
  taskResults: TaskResult[];
  /** 训练会话（作答轨迹持久化：禁止中断丢失已作答） */
  sessions: TrainingSession[];
  /** 错题本（F0149 答错自动入库） */
  wrongBook: WrongBookEntry[];
  /** 今日临时可用时间覆盖（F0054） */
  todayMinutesOverride: number | null;
  /** 周复盘（状态机：待生成→待确认→已重排；禁止静默改变下周目标） */
  weeklyReview: WeeklyReview | null;
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
  /** Horizon Reveal 当天是否已播放（§7.4/§8.9 一天只完整执行一次） */
  lastRevealDate: string | null;
  setAgreements: (a: Agreements) => void;
  setGoal: (g: ExamGoal) => void;
  setConditions: (c: LearningConditions) => void;
  setNickname: (n: string) => void;
  addImport: (i: ScoreImport) => void;
  upsertImport: (i: ScoreImport) => void;
  setBaseline: (b: BaselineSnapshot) => void;
  setDiagnosis: (d: Diagnosis) => void;
  setPrescription: (p: Prescription) => void;
  addTaskResult: (r: TaskResult) => void;
  upsertSession: (s: TrainingSession) => void;
  addWrongEntries: (e: WrongBookEntry[]) => void;
  updateWrongEntry: (questionId: string, patch: Partial<WrongBookEntry>) => void;
  setTodayMinutesOverride: (m: number | null) => void;
  setWeeklyReview: (w: WeeklyReview) => void;
  addAiFeedback: (f: { target: string; helpful: boolean | null; reported: boolean; reason: string }) => void;
  purchaseMembership: (plan: Membership["plan"], ok: boolean) => void;
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
  confirmedAt: string | null;
}

export interface Membership {
  plan: "free" | "pro-monthly" | "pro-yearly";
  /** 免费版每周诊断生成额度 */
  diagnosisQuota: number;
  usedDiagnosis: number;
  orders: Array<{ id: string; plan: Membership["plan"]; status: "处理中" | "成功" | "失败"; at: string }>;
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
      prescription: null,
      taskResults: [],
      sessions: [],
      wrongBook: [],
      todayMinutesOverride: null,
      weeklyReview: null,
      aiFeedback: [],
      membership: { plan: "free", diagnosisQuota: 3, usedDiagnosis: 0, orders: [] },
      lastRevealDate: null,
      setAgreements: (agreements) =>
        set((s) => ({ profile: { ...s.profile, agreements } })),
      setGoal: (goal) => set((s) => ({ profile: { ...s.profile, goal } })),
      setConditions: (conditions) =>
        set((s) => ({ profile: { ...s.profile, conditions } })),
      setNickname: (nickname) => set((s) => ({ profile: { ...s.profile, nickname } })),
      addImport: (imp) => set((s) => ({ imports: [...s.imports, imp] })),
      upsertImport: (imp) =>
        set((s) => {
          const rest = s.imports.filter((x) => x.id !== imp.id);
          return { imports: [...rest, imp] };
        }),
      setBaseline: (baseline) => set({ baseline }),
      setDiagnosis: (diagnosis) => set({ diagnosis }),
      setPrescription: (prescription) => set({ prescription }),
      addTaskResult: (r) => set((s) => ({ taskResults: [...s.taskResults, r] })),
      upsertSession: (session) =>
        set((s) => {
          const rest = s.sessions.filter((x) => x.id !== session.id);
          return { sessions: [...rest, session] };
        }),
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
      setWeeklyReview: (weeklyReview) => set({ weeklyReview }),
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
      markRevealed: (lastRevealDate) => set({ lastRevealDate }),
      reset: () =>
        set({
          profile: emptyProfile,
          imports: [],
          baseline: null,
          diagnosis: null,
          prescription: null,
          taskResults: [],
          sessions: [],
          wrongBook: [],
          todayMinutesOverride: null,
          weeklyReview: null,
          aiFeedback: [],
          membership: { plan: "free", diagnosisQuota: 3, usedDiagnosis: 0, orders: [] },
          lastRevealDate: null,
        }),
    }),
    {
      name: "jianan-profile",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
