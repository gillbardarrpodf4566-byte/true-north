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

/** 一次已确认入库的模考成绩（数据接入与建档 产物） */
export interface ScoreImport {
  id: string;
  /** F0047 来源标签 */
  source: "截图" | "手工录入";
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
  setAgreements: (a: Agreements) => void;
  setGoal: (g: ExamGoal) => void;
  setConditions: (c: LearningConditions) => void;
  setNickname: (n: string) => void;
  addImport: (i: ScoreImport) => void;
  setBaseline: (b: BaselineSnapshot) => void;
  reset: () => void;
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
      setAgreements: (agreements) =>
        set((s) => ({ profile: { ...s.profile, agreements } })),
      setGoal: (goal) => set((s) => ({ profile: { ...s.profile, goal } })),
      setConditions: (conditions) =>
        set((s) => ({ profile: { ...s.profile, conditions } })),
      setNickname: (nickname) => set((s) => ({ profile: { ...s.profile, nickname } })),
      addImport: (imp) => set((s) => ({ imports: [...s.imports, imp] })),
      setBaseline: (baseline) => set({ baseline }),
      reset: () => set({ profile: emptyProfile, imports: [], baseline: null }),
    }),
    {
      name: "jianan-profile",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
