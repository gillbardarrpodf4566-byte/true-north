/**
 * 申论内容版本仓库（F0344–F0347）：草稿/发布/归档三态，发布原子切换，历史不可变。
 */
import { getDb } from "./db";
import { audit, type StaffRow } from "./admin";
import {
  seedBundles,
  validateEssayBundle,
  type EssayContentBundle,
  type EssayRevisionMeta,
  type EssayRevisionStatus,
} from "@/lib/essay/content";
import type { EssayQuestion } from "@/lib/essay/types";

interface VersionRow {
  question_id: string;
  revision: number;
  status: EssayRevisionStatus;
  bundle_json: string;
  change_reason: string;
  ticket_ref: string | null;
  supersedes_revision: number | null;
  created_by: string;
  created_at: string;
  published_by: string | null;
  published_at: string | null;
}

function toMeta(row: VersionRow): EssayRevisionMeta {
  return {
    questionId: row.question_id,
    revision: row.revision,
    status: row.status,
    changeReason: row.change_reason,
    ticketRef: row.ticket_ref,
    supersedesRevision: row.supersedes_revision,
    createdBy: row.created_by,
    createdAt: row.created_at,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  };
}

export function ensureEssayContentSeeded(): void {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM essay_content_versions").get() as { n: number }).n;
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO essay_content_versions
     (question_id, revision, status, bundle_json, change_reason, ticket_ref, supersedes_revision, created_by, created_at, published_by, published_at)
     VALUES (?, 1, 'published', ?, '初始内容包（种子）', NULL, NULL, 'system', ?, 'system', ?)`,
  );
  const now = new Date().toISOString();
  for (const bundle of seedBundles()) {
    insert.run(bundle.question.id, JSON.stringify(bundle), now, now);
  }
}

export function listEssayQuestionIds(): string[] {
  ensureEssayContentSeeded();
  return (getDb()
    .prepare("SELECT DISTINCT question_id FROM essay_content_versions ORDER BY question_id")
    .all() as Array<{ question_id: string }>).map((row) => row.question_id);
}

export function listEssayRevisions(questionId: string): EssayRevisionMeta[] {
  ensureEssayContentSeeded();
  return (getDb()
    .prepare("SELECT * FROM essay_content_versions WHERE question_id = ? ORDER BY revision DESC")
    .all(questionId) as unknown as VersionRow[]).map(toMeta);
}

export function getEssayBundle(questionId: string, revision: number): { bundle: EssayContentBundle; meta: EssayRevisionMeta } | null {
  ensureEssayContentSeeded();
  const row = getDb()
    .prepare("SELECT * FROM essay_content_versions WHERE question_id = ? AND revision = ?")
    .get(questionId, revision) as VersionRow | undefined;
  if (!row) return null;
  return { bundle: JSON.parse(row.bundle_json) as EssayContentBundle, meta: toMeta(row) };
}

export function getPublishedEssayBundle(questionId: string): { bundle: EssayContentBundle; meta: EssayRevisionMeta } | null {
  ensureEssayContentSeeded();
  const row = getDb()
    .prepare("SELECT * FROM essay_content_versions WHERE question_id = ? AND status = 'published'")
    .get(questionId) as VersionRow | undefined;
  if (!row) return null;
  return { bundle: JSON.parse(row.bundle_json) as EssayContentBundle, meta: toMeta(row) };
}

export function publishedEssayQuestions(): Array<{ question: EssayQuestion; revision: number }> {
  return listEssayQuestionIds().flatMap((questionId) => {
    const published = getPublishedEssayBundle(questionId);
    return published ? [{ question: published.bundle.question, revision: published.meta.revision }] : [];
  });
}

export function saveEssayDraft(
  input: { questionId: string; bundle: unknown; changeReason: string; ticketRef?: string | null },
  staff: StaffRow,
): { ok: true; revision: number } | { ok: false; issues: string[] } {
  ensureEssayContentSeeded();
  const validated = validateEssayBundle(input.bundle);
  if (!validated.ok) return { ok: false, issues: validated.issues };
  if (validated.bundle.question.id !== input.questionId) {
    return { ok: false, issues: ["内容包 question.id 与目标题目不一致。"] };
  }
  const reason = input.changeReason.trim();
  if (reason === "") return { ok: false, issues: ["必须填写变更原因（审计要求）。"] };

  const db = getDb();
  const latest = (db
    .prepare("SELECT MAX(revision) AS r FROM essay_content_versions WHERE question_id = ?")
    .get(input.questionId) as { r: number | null }).r ?? 0;
  const published = db
    .prepare("SELECT revision FROM essay_content_versions WHERE question_id = ? AND status = 'published'")
    .get(input.questionId) as { revision: number } | undefined;
  const revision = latest + 1;
  db.prepare(
    `INSERT INTO essay_content_versions
     (question_id, revision, status, bundle_json, change_reason, ticket_ref, supersedes_revision, created_by, created_at)
     VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.questionId,
    revision,
    JSON.stringify(validated.bundle),
    reason,
    input.ticketRef?.trim() || null,
    published?.revision ?? null,
    staff.display_name,
    new Date().toISOString(),
  );
  audit(staff, `申论内容草稿 ${input.questionId} r${revision}：${reason}`);
  return { ok: true, revision };
}

export function publishEssayRevision(
  input: { questionId: string; revision: number },
  staff: StaffRow,
): { ok: true } | { ok: false; issues: string[] } {
  ensureEssayContentSeeded();
  const target = getEssayBundle(input.questionId, input.revision);
  if (!target) return { ok: false, issues: ["目标版本不存在。"] };
  if (target.meta.status === "published") return { ok: false, issues: ["该版本已是发布版本。"] };
  const validated = validateEssayBundle(target.bundle);
  if (!validated.ok) return { ok: false, issues: validated.issues };

  const db = getDb();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE essay_content_versions SET status = 'archived' WHERE question_id = ? AND status = 'published'",
    ).run(input.questionId);
    db.prepare(
      "UPDATE essay_content_versions SET status = 'published', published_by = ?, published_at = ? WHERE question_id = ? AND revision = ?",
    ).run(staff.display_name, now, input.questionId, input.revision);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  audit(staff, `申论内容发布 ${input.questionId} r${input.revision}`);
  return { ok: true };
}
