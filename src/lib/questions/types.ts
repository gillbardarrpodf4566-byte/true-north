/** 题库领域类型（F0145 题目标签 / F0146 真题标识） */

export type QuestionType = "逻辑填空" | "片段阅读" | "图形推理" | "类比推理" | "翻译推理"
  | "数学运算" | "文字型资料" | "图表型资料" | "表格型资料" | "政治常识" | "法律常识" | "经济常识";

export type ErrorCause = "知识缺口" | "策略选择错误" | "审题错误" | "计算错误" | "定位错误";

export interface TableMaterial {
  kind: "table";
  title: string;
  /** 列头 */
  columns: string[];
  rows: Array<{ label: string; values: string[] }>;
  note?: string;
}

export interface Question {
  id: string;
  moduleId: import("@/lib/profile/types").ModuleId;
  type: QuestionType;
  /** 1 基础 / 2 中等 / 3 较难 */
  difficulty: 1 | 2 | 3;
  knowledgePoint: string;
  /** F0146 真题标识；模拟题为 null */
  realExam: { year: number; region: string; exam: string } | null;
  /** 题干材料（资料分析为图表/表格） */
  material?: TableMaterial;
  stem: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  /** 每个干扰项对应的错因（错因诊断证据来源，F0151–F0153） */
  errorCauseByOption: Record<number, ErrorCause>;
  /** 该题训练的能力（处方目标能力对应） */
  skillTarget: string;
}
