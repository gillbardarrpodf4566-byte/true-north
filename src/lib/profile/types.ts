/** 考生档案与考试目标（功能清单：备考目标与个人画像 / 账号与首次使用） */

export type ExamType = "国考" | "省考" | "事业单位";

export interface ExamGoal {
  /** F0015 考试类型 */
  type: ExamType;
  /** F0016 具体批次与地区 */
  examName: string;
  region: string;
  /** F0017 考试日期（ISO yyyy-mm-dd） */
  examDate: string;
  /** F0018 目标分数：总分与分模块目标 */
  targetTotal: number;
  targetModules: Partial<Record<ModuleId, number>>;
}

export type Stage = "零基础" | "基础" | "强化" | "冲刺";

export interface LearningConditions {
  /** F0020 工作日/周末每日可学习分钟数 */
  weekdayMinutes: number;
  weekendMinutes: number;
  /** F0021 可学习时间窗（P1，允许为空） */
  timeWindows?: string;
  /** F0022 备考阶段自评 */
  stage: Stage;
  /** F0024 自评薄弱模块（P1） */
  selfWeakModules: ModuleId[];
}

export interface Agreements {
  /** F0006 用户协议与隐私政策 */
  userAgreement: boolean;
  /** F0007 AI 能力边界说明 */
  aiBoundary: boolean;
  /** F0008/F0009 通知与相册权限（可拒绝，不阻塞） */
  notification?: boolean;
  album?: boolean;
}

export interface Profile {
  nickname: string;
  goal: ExamGoal | null;
  conditions: LearningConditions | null;
  agreements: Agreements | null;
}

export const MODULES = [
  "言语理解",
  "判断推理",
  "数量关系",
  "资料分析",
  "常识判断",
] as const;

export type ModuleId = (typeof MODULES)[number];

/** 行测五大模块的合理区间（F0045 异常值检测依据，mock 语义：实际以题库为准） */
export const MODULE_FULL_SCORE: Record<ModuleId, number> = {
  言语理解: 40,
  判断推理: 40,
  数量关系: 15,
  资料分析: 20,
  常识判断: 20,
};

export const TOTAL_FULL_SCORE = 135;
