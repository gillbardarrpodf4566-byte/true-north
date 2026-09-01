/**
 * 智能选岗领域类型（V1 / F0257–F0275 / CL-08）。
 * 铁律（xlsx）：资格硬条件用确定性规则；AI 只做解释和软排序；预测必须标不确定性；
 * 每个关键数据标注来源与更新时间（F0270）。
 */

export type EducationLevel = "大专" | "本科" | "硕士" | "博士";
export type PoliticalStatus = "群众" | "共青团员" | "中共党员";

/** 用户资格条件与偏好（F0257/F0258） */
export interface JobSeekerProfile {
  education: EducationLevel;
  major: string;
  isFreshGraduate: boolean;
  politicalStatus: PoliticalStatus;
  /** 基层工作年限 */
  grassrootsYears: number;
  preferences: {
    /** 地区与单位层级偏好（F0258） */
    region?: string;
    unitLevel?: string;
    /** 粗粒度通勤容忍度，不伪造分钟级路线数据。 */
    commute?: "同区优先" | "同城可接受" | "可跨城";
    /** 发展偏好仅在职位有官方标签时参与排序；当前无标签则明确披露。 */
    developmentPriorities?: Array<"晋升通道" | "专业相关" | "稳定性" | "工作生活平衡">;
    riskAppetite?: "稳妥" | "均衡" | "冲刺";
  };
  updatedAt: string;
}

export interface PositionHistory {
  year: number;
  /** 招录人数（F0266） */
  recruited: number;
  /** 历史进面分（F0267），null=无数据 */
  interviewScore: number | null;
  /** 报名人数（竞争趋势 F0268） */
  applicants: number | null;
}

export interface JobPosition {
  id: string;
  name: string;
  department: string;
  region: string;
  unitLevel: string;
  /** 招录人数（当年） */
  recruiting: number;
  /** 学历最低要求 */
  minEducation: EducationLevel;
  /** 专业要求：大类名（走同义映射）或 ["不限"] */
  majorCategories: string[];
  politicalRequirement: PoliticalStatus;
  requiresGrassroots: boolean;
  /** 仅限应届 */
  freshOnly: boolean;
  history: PositionHistory[];
  /**
   * F0354/F0270 数据来源与更新时间。
   * origin=simulated 表示演示种子数据，不得作为官方公告依据展示或推荐。
   */
  source: { name: string; file: string; updatedAt: string; origin: "verified" | "simulated" };
}

export type MatchVerdict = "可报" | "不可报" | "待人工确认";

export interface RequirementCheck {
  field: "学历" | "专业" | "政治面貌" | "基层经历" | "应届";
  pass: boolean;
  /** 不可报原因逐条展示（F0260） */
  reason?: string;
  /** 专业同义匹配需要人工确认（F0261） */
  needsConfirm?: boolean;
}

export interface JobMatch {
  position: JobPosition;
  /** 使用的资格规则版本（F0353，可审计） */
  ruleRevision?: number;
  verdict: MatchVerdict;
  checks: RequirementCheck[];
  /** 冲稳保分组（F0264）；数据不足时为 undefined */
  tier?: "冲" | "稳" | "保";
  /** 匹配理由（F0265） */
  reasons: string[];
  /** 竞争比（当年报名估算/招录） */
  competitionRatio: number | null;
  /** 数据是否过期（>365 天，F0270） */
  dataStale: boolean;
  /** 可解释偏好排序分；仅对有来源事实的因素计分。 */
  preferenceScore?: number;
  /** 因缺少来源数据而未参与排序的因素。 */
  unavailableFactors?: string[];
}

/** 报名节点（F0274） */
export interface ExamNode {
  id: string;
  name: string;
  date: string;
  kind: "报名" | "审核" | "缴费" | "准考证" | "笔试";
}

export const EDUCATION_ORDER: Record<EducationLevel, number> = {
  大专: 1,
  本科: 2,
  硕士: 3,
  博士: 4,
};

export const POLITICAL_ORDER: Record<PoliticalStatus, number> = {
  群众: 1,
  共青团员: 2,
  中共党员: 3,
};
