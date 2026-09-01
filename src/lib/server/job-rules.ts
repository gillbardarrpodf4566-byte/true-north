import { getDb } from "./db";
import { audit, type StaffRow } from "./admin";
import { DEFAULT_RULE_SET, validateRuleSet, type QualificationRuleSet } from "@/lib/jobs/rules";

export type RuleRevisionStatus = "draft" | "published" | "archived";

export interface RuleRevision {
  id: number;
  revision: number;
  status: RuleRevisionStatus;
  rules: QualificationRuleSet;
  changeReason: string;
  createdBy: string;
  createdAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
}

interface Row {
  id: number;
  revision: number;
  status: RuleRevisionStatus;
  rules_json: string;
  change_reason: string;
  created_by: string;
  created_at: string;
  published_by: string | null;
  published_at: string | null;
}

function fromRow(row: Row): RuleRevision {
  return {
    id: row.id,
    revision: row.revision,
    status: row.status,
    rules: JSON.parse(row.rules_json) as QualificationRuleSet,
    changeReason: row.change_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  };
}

export function ensureRulesSeeded(): void {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM qualification_rule_versions").get() as { n: number }).n;
  if (count > 0) return;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO qualification_rule_versions
     (revision, status, rules_json, change_reason, created_by, created_at, published_by, published_at)
     VALUES (1, 'published', ?, '初始资格规则（种子）', 'system', ?, 'system', ?)`,
  ).run(JSON.stringify(DEFAULT_RULE_SET), now, now);
}

export function listRules(): RuleRevision[] {
  ensureRulesSeeded();
  return (getDb().prepare("SELECT * FROM qualification_rule_versions ORDER BY revision DESC").all() as unknown as Row[]).map(fromRow);
}

export function activeRules(): RuleRevision {
  ensureRulesSeeded();
  const row = getDb().prepare("SELECT * FROM qualification_rule_versions WHERE status = 'published'").get() as unknown as Row;
  return fromRow(row);
}

export function saveRuleDraft(input: { rules: unknown; changeReason: string }, staff: StaffRow): { ok: true; revision: number } | { ok: false; issues: string[] } {
  ensureRulesSeeded();
  const validated = validateRuleSet(input.rules);
  if (!validated.ok) return validated;
  const reason = input.changeReason.trim();
  if (!reason) return { ok: false, issues: ["必须填写变更原因。"] };
  const db = getDb();
  const latest = (db.prepare("SELECT MAX(revision) AS r FROM qualification_rule_versions").get() as { r: number | null }).r ?? 0;
  const revision = latest + 1;
  db.prepare(
    `INSERT INTO qualification_rule_versions
     (revision, status, rules_json, change_reason, created_by, created_at)
     VALUES (?, 'draft', ?, ?, ?, ?)`,
  ).run(revision, JSON.stringify(validated.rules), reason, staff.display_name, new Date().toISOString());
  audit(staff, `资格规则草稿 r${revision}：${reason}`);
  return { ok: true, revision };
}

export function publishRuleRevision(revision: number, staff: StaffRow): { ok: true } | { ok: false; issues: string[] } {
  ensureRulesSeeded();
  const row = getDb().prepare("SELECT * FROM qualification_rule_versions WHERE revision = ?").get(revision) as unknown as Row | undefined;
  if (!row) return { ok: false, issues: ["目标规则版本不存在。"] };
  const valid = validateRuleSet(JSON.parse(row.rules_json));
  if (!valid.ok) return valid;
  const db = getDb();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE qualification_rule_versions SET status = 'archived' WHERE status = 'published'").run();
    db.prepare("UPDATE qualification_rule_versions SET status = 'published', published_by = ?, published_at = ? WHERE revision = ?").run(staff.display_name, now, revision);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(staff, `资格规则发布 r${revision}`);
  return { ok: true };
}
