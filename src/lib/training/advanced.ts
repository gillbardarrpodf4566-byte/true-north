/** V1 训练中心增强（F0126/F0128/F0129/F0131/F0138/F0140/F0143/F0147）。 */
import { buildTrainingSet, seedQuestions } from "@/lib/questions/seed";
import type { Question } from "@/lib/questions/types";
import type { ModuleId } from "@/lib/profile/types";
import type { WrongBookEntry } from "@/lib/errorcause/engine";

export interface AnswerChange {
  from: number | null;
  to: number;
  at: string;
}

export interface AnswerTrace {
  questionId: string;
  changes: AnswerChange[];
  final: number | null;
  seconds: number;
}

/** F0126 混合练习：跨模块轮换，每模块一题起步，再按权重补齐 */
export function buildMixedSet(modules: ModuleId[], count: number, offset = 0): Question[] {
  if (modules.length === 0) return [];
  const pools = modules.map((m) => seedQuestions(m));
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const pool = pools[(i + offset) % pools.length]!;
    out.push(pool[Math.floor((i + offset) / pools.length) % pool.length]!);
  }
  return out;
}

/** F0128 错题复测：按错因/遗忘风险，去重后只取可用题 */
export function buildWrongRetestSet(
  book: WrongBookEntry[],
  limit = 10,
): Question[] {
  const preferred = book
    .filter((w) => w.status !== "已修复")
    .map((w) => w.questionId)
    .map((id) => seedQuestionsFromId(id))
    .filter((q): q is Question => q != null);
  return dedupeQuestions(preferred).slice(0, limit);
}

/** F0129 自动组卷：按目标模块 + 薄弱题型混合；下线过滤由 caller 注入 */
export function autoAssemble(
  weakModules: ModuleId[],
  count: number,
  mode: "专项" | "混合" | "复习" | "速度",
): Question[] {
  const modules = weakModules.length > 0 ? weakModules : ["言语理解", "判断推理", "资料分析"] as ModuleId[];
  if (mode === "混合") return buildMixedSet(modules, count);
  const q = buildTrainingSet(modules[0]!, count);
  if (mode === "速度") return q.map((x) => ({ ...x, difficulty: Math.min(3, Math.max(1, x.difficulty)) as 1 | 2 | 3 }));
  return q;
}

/** F0131 答案修改轨迹：每次变更保留，不只保存最终答案 */
export function appendAnswerChange(
  trace: AnswerTrace,
  to: number,
  at = new Date(),
): AnswerTrace {
  return { ...trace, final: to, changes: [...trace.changes, { from: trace.final, to, at: at.toISOString() }] };
}

/** F0138 策略反馈：按轨迹给可行动的更优路径，不只给答案 */
export function strategyFeedback(
  q: Question,
  trace: AnswerTrace,
): { conclusion: string; evidence: string; next: string } {
  if (trace.changes.length >= 2 && trace.final === q.answerIndex) {
    return {
      conclusion: "你最后答对了，但修改次数偏多。",
      evidence: `这题改了 ${trace.changes.length} 次，最后一次才稳定下来。`,
      next: `下一题先锁定「${q.knowledgePoint}」的判断条件，再决定是否修改。`,
    };
  }
  if (trace.seconds > 90 && trace.final === q.answerIndex) {
    return {
      conclusion: "答案正确，但执行成本偏高。",
      evidence: `用时 ${trace.seconds} 秒，超过大多数同难度题的节奏。`,
      next: "再做两道同方法题，目标是先保持正确，再逐步缩短时间。",
    };
  }
  return {
    conclusion: trace.final === q.answerIndex ? "路径稳定。" : "先修正差异最大的步骤。",
    evidence: `本题考查「${q.skillTarget}」，你的作答轨迹已记录。`,
    next: trace.final === q.answerIndex ? "安排一道近邻题验证迁移。" : q.explanation,
  };
}

/** F0140 错后近邻题：同知识点、不同题干 */
export function neighborQuestions(q: Question, count = 3): Question[] {
  return seedQuestions(q.moduleId).filter((x) => x.id !== q.id && x.knowledgePoint === q.knowledgePoint).slice(0, count);
}

/** F0143 训练结束下一步 */
export function nextStepSuggestion(input: {
  met: boolean;
  wrongCount: number;
  remainingMinutes: number;
}): { label: string; href: string; reason: string } {
  if (input.wrongCount > 0) return { label: "确认错因并修复", href: "/train/wrongbook", reason: "把刚才的错误转成下一次能验证的修复动作。" };
  if (input.met && input.remainingMinutes >= 10) return { label: "再做一组近邻题", href: "/train", reason: "还有时间，趁方法清晰时验证迁移。" };
  if (input.met) return { label: "今天先到这里", href: "/today", reason: "目标已达成，保持节奏比盲目加量重要。" };
  return { label: "调整今天处方", href: "/today", reason: "本次未达标，先调整任务难度或时长。" };
}

/** F0147 题目版本：服务端由 admin question_status/audit 记录；UI 展示版本号 */
export interface QuestionVersion {
  version: string;
  changedAt: string;
  changedBy: string;
  change: string;
}

export function questionVersionHistory(q: Question): QuestionVersion[] {
  return [{ version: "seed-v1", changedAt: "2026-08-31", changedBy: "system", change: `初始${q.type}题与解析` }];
}

function seedQuestionsFromId(id: string): Question | null {
  const prefixes: Array<[string, ModuleId]> = [["yw-", "言语理解"], ["tp-", "判断推理"], ["sl-", "数量关系"], ["fa-", "资料分析"], ["cs-", "常识判断"]];
  const found = prefixes.find(([p]) => id.startsWith(p));
  if (!found) return null;
  const index = Number(id.slice(found[0].length));
  return Number.isInteger(index) && index >= 0 ? seedQuestions(found[1])[index] ?? null : null;
}

function dedupeQuestions(qs: Question[]): Question[] {
  const seen = new Set<string>();
  return qs.filter((q) => !seen.has(q.id) && (seen.add(q.id), true));
}
