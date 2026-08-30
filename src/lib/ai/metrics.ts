/**
 * AI 调用指标采集（AI观测与成本 F0382–F0387 的数据源）。
 * MVP 为进程内环形缓冲；真实部署替换为指标管道（Prometheus/OTel）。
 */
export interface AiCallMetric {
  at: string;
  /** 功能：parse=截图解析 diagnose=诊断 coach=对话 */
  fn: "parse" | "diagnose" | "coach" | "errorcause";
  ms: number;
  ok: boolean;
  /** 结构化输出失败（Schema 校验不过） */
  schemaFail: boolean;
  /** 用户在确认页修改的字段数（用户纠正率分子） */
  correctedFields?: number;
  tokens?: number;
}

const BUFFER: AiCallMetric[] = [];
const MAX = 500;

export function recordAiCall(m: AiCallMetric): void {
  BUFFER.push(m);
  if (BUFFER.length > MAX) BUFFER.shift();
}

export function getAiMetrics(): AiCallMetric[] {
  return [...BUFFER];
}

export interface AiCallSummary {
  total: number;
  successRate: number;
  p50: number;
  p95: number;
  schemaFailRate: number;
  correctionRate: number;
  totalTokens: number;
}

export function summarizeAiCalls(fn?: AiCallMetric["fn"]): AiCallSummary {
  const rows = fn ? BUFFER.filter((m) => m.fn === fn) : BUFFER;
  const sorted = [...rows].map((r) => r.ms).sort((a, b) => a - b);
  const at = (p: number): number =>
    sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
  const schemaFails = rows.filter((r) => r.schemaFail).length;
  const withCorrections = rows.filter((r) => (r.correctedFields ?? 0) > 0).length;
  return {
    total: rows.length,
    successRate: rows.length === 0 ? 1 : rows.filter((r) => r.ok).length / rows.length,
    p50: at(0.5),
    p95: at(0.95),
    schemaFailRate: rows.length === 0 ? 0 : schemaFails / rows.length,
    correctionRate: rows.length === 0 ? 0 : withCorrections / rows.length,
    totalTokens: rows.reduce((s, r) => s + (r.tokens ?? 420), 0),
  };
}
