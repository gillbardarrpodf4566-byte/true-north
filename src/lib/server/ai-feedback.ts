import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { redactFeedback, type PiiCategory } from "@/lib/ai/feedbackRedaction";

export type ProducerKind = "model" | "rule_engine";

export interface AiInvocation {
  id: string;
  userId: number | null;
  producerKind: ProducerKind;
  feature: string;
  modelVersion: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  createdAt: string;
}

export interface AiFeedbackCandidate {
  id: number;
  ticketId: number | null;
  invocationId: string | null;
  category: string;
  sanitizedExcerpt: string;
  redactionVersion: string;
  piiCategories: PiiCategory[];
  provenanceStatus: "verified" | "unavailable";
  reviewStatus: "review_required" | "approved" | "blocked";
  promoted: boolean;
  producerKind: ProducerKind | null;
  feature: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  createdAt: string;
}

export function recordAiInvocation(input: Omit<AiInvocation, "id" | "createdAt">): AiInvocation {
  const invocation: AiInvocation = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  getDb().prepare(
    `INSERT INTO ai_invocations (id, user_id, producer_kind, feature, model_version, prompt_version, schema_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(invocation.id, invocation.userId, invocation.producerKind, invocation.feature, invocation.modelVersion, invocation.promptVersion, invocation.schemaVersion, invocation.createdAt);
  return invocation;
}

function findInvocation(id: string | null | undefined, userId: number | null): AiInvocation | null {
  if (!id) return null;
  const row = getDb().prepare(
    `SELECT id, user_id, producer_kind, feature, model_version, prompt_version, schema_version, created_at
     FROM ai_invocations WHERE id = ?`,
  ).get(id) as {
    id: string; user_id: number | null; producer_kind: ProducerKind; feature: string;
    model_version: string | null; prompt_version: string | null; schema_version: string | null; created_at: string;
  } | undefined;
  if (!row || row.user_id !== userId) return null;
  return {
    id: row.id,
    userId: row.user_id,
    producerKind: row.producer_kind,
    feature: row.feature,
    modelVersion: row.model_version,
    promptVersion: row.prompt_version,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
  };
}

/**
 * 仅 AI/rule 输出相关 target 才可进入候选池。无可信 invocation 时保留为 unavailable，
 * 不为其补写当前模型/Prompt 版本，也不可直接晋升评测集。
 */
export function createAiFeedbackCandidate(input: {
  ticketId: number;
  category: string;
  rawText: string;
  invocationId?: string | null;
  userId: number | null;
}): AiFeedbackCandidate {
  const redacted = redactFeedback(input.rawText);
  const invocation = findInvocation(input.invocationId, input.userId);
  const provenanceStatus = invocation ? "verified" : "unavailable";
  const reviewStatus = invocation ? "review_required" : "blocked";
  const result = getDb().prepare(
    `INSERT INTO ai_feedback_candidates
     (ticket_id, invocation_id, category, sanitized_excerpt, redaction_version, pii_categories, provenance_status, review_status, promoted, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(input.ticketId, invocation?.id ?? null, input.category, redacted.sanitizedExcerpt, redacted.redactionVersion, JSON.stringify(redacted.piiCategories), provenanceStatus, reviewStatus, new Date().toISOString());
  const id = Number(result.lastInsertRowid);
  return {
    id,
    ticketId: input.ticketId,
    invocationId: invocation?.id ?? null,
    category: input.category,
    sanitizedExcerpt: redacted.sanitizedExcerpt,
    redactionVersion: redacted.redactionVersion,
    piiCategories: redacted.piiCategories,
    provenanceStatus,
    reviewStatus,
    promoted: false,
    producerKind: invocation?.producerKind ?? null,
    feature: invocation?.feature ?? null,
    modelVersion: invocation?.modelVersion ?? null,
    promptVersion: invocation?.promptVersion ?? null,
    schemaVersion: invocation?.schemaVersion ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function listAiFeedbackCandidates(): AiFeedbackCandidate[] {
  const rows = getDb().prepare(
    `SELECT c.id, c.ticket_id, c.invocation_id, c.category, c.sanitized_excerpt, c.redaction_version, c.pii_categories,
            c.provenance_status, c.review_status, c.promoted, c.created_at,
            i.producer_kind, i.feature, i.model_version, i.prompt_version, i.schema_version
     FROM ai_feedback_candidates c
     LEFT JOIN ai_invocations i ON i.id = c.invocation_id
     ORDER BY c.id DESC LIMIT 200`,
  ).all() as unknown as Array<{
    id: number; ticket_id: number | null; invocation_id: string | null; category: string; sanitized_excerpt: string; redaction_version: string; pii_categories: string;
    provenance_status: "verified" | "unavailable"; review_status: "review_required" | "approved" | "blocked"; promoted: number; created_at: string;
    producer_kind: ProducerKind | null; feature: string | null; model_version: string | null; prompt_version: string | null; schema_version: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id, ticketId: row.ticket_id, invocationId: row.invocation_id, category: row.category, sanitizedExcerpt: row.sanitized_excerpt,
    redactionVersion: row.redaction_version, piiCategories: JSON.parse(row.pii_categories) as PiiCategory[], provenanceStatus: row.provenance_status,
    reviewStatus: row.review_status, promoted: row.promoted === 1, producerKind: row.producer_kind, feature: row.feature,
    modelVersion: row.model_version, promptVersion: row.prompt_version, schemaVersion: row.schema_version, createdAt: row.created_at,
  }));
}
