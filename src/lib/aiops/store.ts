"use client";

/** AI 运营台状态（F0366–F0387 的配置与版本 mock 持久化）。 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface EvalRun {
  id: string;
  at: string;
  suite: "parser" | "diagnosis";
  passRate: number;
  failures: string[];
  /** 通过 | 拦截（F0379 零容忍） */
  gateVerdict: string;
}

interface AiopsState {
  providers: Array<{ id: string; name: string; models: string[] }>;
  routing: { parse: string; diagnose: string; coach: string };
  locked: { model: string; releasedAt: string };
  promptVersions: Array<{ v: string; status: "草稿" | "已发布" | "已回滚"; at: string; note: string }>;
  schemaVersions: Array<{ v: string; at: string; note: string }>;
  evalRuns: EvalRun[];
  dailyBudget: number;
  setRouting: (fn: "parse" | "diagnose" | "coach", model: string) => void;
  publishPrompt: (v: string) => void;
  rollbackPrompt: (v: string) => void;
  addSchemaVersion: (v: string, note: string) => void;
  recordEvalRun: (r: Omit<EvalRun, "id" | "at">) => void;
  setDailyBudget: (n: number) => void;
}

const now = (): string => new Date().toISOString();

export const useAiopsStore = create<AiopsState>()(
  persist(
    (set) => ({
      providers: [
        { id: "mock", name: "Mock Provider（确定性）", models: ["mock-parse-v1", "mock-diag-v1", "mock-coach-v1", "mock-parse-cand"] },
      ],
      routing: { parse: "mock-parse-v1", diagnose: "mock-diag-v1", coach: "mock-coach-v1" },
      locked: { model: "mock-parse-v1", releasedAt: now() },
      promptVersions: [
        { v: "parse-prompt v1.0", status: "已发布", at: now(), note: "初始解析提示词" },
        { v: "diagnosis-prompt v1.0", status: "已发布", at: now(), note: "机会排序判据（GAP-8）" },
        { v: "parse-prompt v1.1", status: "草稿", at: now(), note: "缺失字段表述增强" },
      ],
      schemaVersions: [{ v: "parse-schema v1.0", at: now(), note: "模块/得分/题数/用时/置信度" }],
      evalRuns: [],
      dailyBudget: 500000,
      setRouting: (fn, model) => set((s) => ({ routing: { ...s.routing, [fn]: model } })),
      publishPrompt: (v) =>
        set((s) => ({
          promptVersions: s.promptVersions.map((p) =>
            p.v === v
              ? { ...p, status: "已发布", at: now() }
              : p.status === "已发布" && p.v.split(" ")[0] === v.split(" ")[0]
                ? { ...p, status: "已回滚" }
                : p,
          ),
          locked: { model: v, releasedAt: now() },
        })),
      rollbackPrompt: (v) =>
        set((s) => ({
          promptVersions: s.promptVersions.map((p) =>
            p.v === v ? { ...p, status: "已回滚", at: now() } : p,
          ),
        })),
      addSchemaVersion: (v, note) =>
        set((s) => ({ schemaVersions: [...s.schemaVersions, { v, at: now(), note }] })),
      recordEvalRun: (r) =>
        set((s) => ({
          evalRuns: [...s.evalRuns, { id: `eval-${Date.now()}`, at: now(), ...r }].slice(-50),
        })),
      setDailyBudget: (dailyBudget) => set({ dailyBudget }),
    }),
    { name: "jianan-aiops", storage: createJSONStorage(() => localStorage) },
  ),
);
