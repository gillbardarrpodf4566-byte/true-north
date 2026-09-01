import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "jianan-ai-feedback-"));
process.env.JIANAN_DB_PATH = join(dir, "test.db");

const { closeDb } = await import("./db");
const { createAiFeedbackCandidate, listAiFeedbackCandidates, recordAiInvocation } = await import("./ai-feedback");

afterAll(() => { closeDb(); rmSync(dir, { recursive: true, force: true }); });

describe("AI 反馈候选池（F0380/F0363）", () => {
  it("无调用上下文只保存脱敏摘录，明确为来源不可用且不可晋升", () => {
    const candidate = createAiFeedbackCandidate({ ticketId: 1, category: "解析错误", rawText: "我手机号 13800138000，OCR 把得分认错", userId: null });
    expect(candidate.sanitizedExcerpt).not.toContain("13800138000");
    expect(candidate.provenanceStatus).toBe("unavailable");
    expect(candidate.reviewStatus).toBe("blocked");
    expect(candidate.modelVersion).toBeNull();
    expect(listAiFeedbackCandidates().find((item) => item.id === candidate.id)?.sanitizedExcerpt).not.toContain("13800138000");
  });

  it("受验证的规则引擎调用保留实际来源，不伪造模型或 Prompt", () => {
    const invocation = recordAiInvocation({ userId: 9, producerKind: "rule_engine", feature: "diagnosis", modelVersion: null, promptVersion: null, schemaVersion: "diag-v1" });
    const candidate = createAiFeedbackCandidate({ ticketId: 2, category: "诊断不准", rawText: "诊断证据不足", invocationId: invocation.id, userId: 9 });
    expect(candidate.provenanceStatus).toBe("verified");
    expect(candidate.producerKind).toBe("rule_engine");
    expect(candidate.modelVersion).toBeNull();
    expect(candidate.promptVersion).toBeNull();
    expect(candidate.reviewStatus).toBe("review_required");
  });
});
