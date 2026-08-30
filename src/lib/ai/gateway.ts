/**
 * AiGateway — 所有 LLM 调用的统一入口（GOAL_PROMPT 架构要求 4）。
 *
 * MVP 内使用确定性 mock 适配器：无 API key 时全流程可跑通，且对同一输入
 * 产出稳定结果（E2E 可断言）。真实适配器仅预留接口。
 *
 * 覆盖功能点：F0032 来源识别 / F0033 OCR 解析 / F0034 字段置信度 /
 * F0036 缺失字段标记而非猜测。
 */
import { MODULES, MODULE_FULL_SCORE, type ModuleId } from "@/lib/profile/types";

export interface ParsedModuleScore {
  id: ModuleId;
  score: number | null;
  questions: number | null;
  correct: number | null;
  secondsPerQuestion: number | null;
}

export type FieldConfidence = "high" | "medium" | "low" | "missing";

export interface ParseResult {
  platform: string;
  examLabel: string;
  totalScore: number | null;
  modules: ParsedModuleScore[];
  /** 逐字段置信度，key = `module:${id}:score` 等 */
  confidence: Record<string, FieldConfidence>;
  /** F0032 来源识别置信度 */
  sourceConfidence: FieldConfidence;
}

export interface ScoreScreenshotInput {
  /** 文件名用于确定性 mock；真实适配器为图像字节 */
  fileName: string;
  sizeBytes: number;
}

export interface AiGateway {
  parseScoreScreenshot(input: ScoreScreenshotInput): Promise<ParseResult>;
}

/** 确定性伪随机（mulberry32），保证同一输入永远同一输出 */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export class MockAiGateway implements AiGateway {
  async parseScoreScreenshot(input: ScoreScreenshotInput): Promise<ParseResult> {
    const rand = seededRandom(hashString(input.fileName) ^ input.sizeBytes);
    const platform = rand() > 0.5 ? "粉笔" : "华图";
    const confidence: Record<string, FieldConfidence> = {};

    const modules: ParsedModuleScore[] = MODULES.map((id) => {
      const full = MODULE_FULL_SCORE[id];
      const questions = Math.round(full * (id === "数量关系" ? 0.67 : 1));
      // 文件名含 partial：模拟一张截图缺少部分模块（F0036 缺失标记）
      if (input.fileName.includes("partial") && id === "常识判断") {
        confidence[`module:${id}:score`] = "missing";
        return { id, score: null, questions: null, correct: null, secondsPerQuestion: null };
      }
      const score = round1(full * (0.45 + rand() * 0.4));
      const correct = Math.round(score / full * questions);
      const secPerQuestion = Math.round(40 + rand() * 50);
      // 确定性低置信：文件名含 lowconf 的字段 + 每次解析固定一名「用时」字段
      const lowConf = input.fileName.includes("lowconf") && id === "资料分析";
      confidence[`module:${id}:score`] = lowConf ? "low" : "high";
      confidence[`module:${id}:seconds`] = id === "资料分析" && rand() > 0.5 ? "medium" : "high";
      return { id, score, questions, correct, secondsPerQuestion: secPerQuestion };
    });

    const withScore = modules.filter((m) => m.score != null);
    const totalScore =
      withScore.length === MODULES.length
        ? round1(withScore.reduce((s, m) => s + (m.score ?? 0), 0))
        : null;
    if (totalScore == null) confidence["total"] = "missing";

    return {
      platform,
      examLabel: `${platform}模考`,
      totalScore,
      modules,
      confidence,
      sourceConfidence: "high",
    };
  }
}

/** 真实适配器接入点（MVP 不实现，接口即契约） */
export const aiGateway: AiGateway = new MockAiGateway();
