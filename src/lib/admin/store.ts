"use client";

/**
 * 管理后台状态（内容运营 F0340–0343 / 考试管理 F0350 / 会员配置 F0358 /
 * 权限审计 F0364–F0365）。MVP 为本机 mock：真实部署替换为服务端 RBAC。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type QuestionStatus = "草稿" | "审核" | "已发布" | "已下线";

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
}

interface AdminState {
  /** 题库状态覆盖（未记录的题视为「已发布」） */
  questionStatus: Record<string, QuestionStatus>;
  exams: Array<{ id: string; name: string; region: string; date: string; subjects: string }>;
  plans: Array<{ id: string; name: string; price: number; benefits: string }>;
  auditLog: AuditEntry[];
  setQuestionStatus: (qid: string, status: QuestionStatus, actor: string) => void;
  addExam: (e: { name: string; region: string; date: string; subjects: string }) => void;
  addPlan: (p: { name: string; price: number; benefits: string }) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      questionStatus: {},
      exams: [
        { id: "exam-1", name: "2026年国考", region: "全国", date: "2026-11-29", subjects: "行测+申论" },
      ],
      plans: [
        { id: "plan-1", name: "见岸 Pro 月度", price: 39, benefits: "无限诊断 / 全模块训练" },
        { id: "plan-2", name: "见岸 Pro 年度", price: 328, benefits: "月度全部权益 + 周复盘深度版" },
      ],
      auditLog: [],
      setQuestionStatus: (qid, status, actor) =>
        set((s) => ({
          questionStatus: { ...s.questionStatus, [qid]: status },
          auditLog: [
            { at: new Date().toISOString(), actor, action: `题目 ${qid} 状态 → ${status}` },
            ...s.auditLog,
          ].slice(0, 200),
        })),
      addExam: (e) =>
        set((s) => ({
          exams: [...s.exams, { id: `exam-${Date.now()}`, ...e }],
          auditLog: [
            { at: new Date().toISOString(), actor: "admin", action: `新增考试批次 ${e.name}` },
            ...s.auditLog,
          ].slice(0, 200),
        })),
      addPlan: (p) =>
        set((s) => ({
          plans: [...s.plans, { id: `plan-${Date.now()}`, ...p }],
          auditLog: [
            { at: new Date().toISOString(), actor: "admin", action: `新增会员套餐 ${p.name}` },
            ...s.auditLog,
          ].slice(0, 200),
        })),
    }),
    { name: "jianan-admin", storage: createJSONStorage(() => localStorage) },
  ),
);
