/**
 * 申论领域类型（V1：申论AI教练 F0198–F0226 / CL-05）。
 * 评分采用「确定性 Rubric + 得分点采点」：评测与训练分离，主观评分
 * 明确参考性质与置信度（F0204/F0212）。
 */

export type EssayType = "概括" | "对策" | "公文" | "大作文";

export interface ScorePoint {
  id: string;
  /** 得分点名称 */
  label: string;
  /** 命中关键词组（组内全含即命中，任意一组命中即可） */
  keywords: string[][];
  points: number;
  /** 材料依据（漏点定位用，F0207） */
  materialQuote: string;
}

export interface EssayRubric {
  /** 题目满分 */
  fullScore: number;
  /** 采点分占比（其余分配给结构/语言/规范） */
  contentWeight: number;
  /** 维度定义（F0205） */
  dimensions: Array<{ id: "内容" | "结构" | "语言" | "规范"; weight: number }>;
  /** 结构信号词（序数/分层/总结） */
  structureSignals: string[];
  /** 口语/不规范词 → 规范表达（F0210） */
  informalWords: Array<{ bad: string; good: string }>;
  /** 结构范例（F0215，不替写） */
  exampleOutline: string[];
}

export interface EssayMaterial {
  title: string;
  paragraphs: string[];
}

export interface EssayQuestion {
  id: string;
  type: EssayType;
  title: string;
  year: number;
  region: string;
  exam: string;
  /** 任务说明（含作答要求） */
  task: string;
  materials: EssayMaterial[];
  /** 字数限制（F0203） */
  wordLimit: number;
  rubric: EssayRubric;
  scorePoints: ScorePoint[];
}

export interface EssaySubmission {
  id: string;
  questionId: string;
  /** 发布内容版本；离线种子回退时为 0。历史报告必须以此解释评分依据。 */
  contentRevision?: number;
  questionType?: EssayType;
  questionTitle?: string;
  text: string;
  submittedAt: string;
  /** 重写轮次：0=首作，1+=重写（F0216） */
  round: number;
}

export interface HitPoint {
  pointId: string;
  label: string;
  points: number;
  /** 命中的用户答案句（证据引用 F0211） */
  userSentence: string;
  sentenceIndex: number;
}

export interface MissedPoint {
  pointId: string;
  label: string;
  points: number;
  /** 材料依据（F0207） */
  materialQuote: string;
}

export interface EssayGrade {
  submissionId: string;
  /** 批改时的发布内容版本；缺省兼容旧本地记录。 */
  contentRevision?: number;
  /** 参考分（0–满分），明确为「参考性质」（F0204） */
  score: number;
  dimensions: Array<{ id: "内容" | "结构" | "语言" | "规范"; score: number; full: number }>;
  /** 采点对齐（F0206） */
  hits: HitPoint[];
  /** 漏点定位（F0207） */
  misses: MissedPoint[];
  /** 冗余/偏题表达（F0208） */
  redundancies: Array<{ sentence: string; reason: string }>;
  /** 结构问题（F0209） */
  structureIssues: string[];
  /** 规范替换建议（F0210） */
  normSuggestions: Array<{ bad: string; good: string }>;
  /** 字数（F0203） */
  wordCount: number;
  wordLimit: number;
  /** 置信等级与限制说明（F0212） */
  confidence: "高" | "中" | "低";
  confidenceNote: string;
  /** 优先修改点 ≤3（F0213） */
  topFixes: Array<{ title: string; action: string; lostPoints: number }>;
  gradedAt: string;
}

/** 用户可纠错（画像开放性，F0079 在申论侧同源） */
export interface EssayAbility {
  type: EssayType;
  /** 四维滚动均值（0–1） */
  dimensions: Array<{ id: "内容" | "结构" | "语言" | "规范"; score: number }>;
  attempts: number;
  lastAt: string;
}
