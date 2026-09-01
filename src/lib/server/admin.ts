/**
 * 管理侧服务端：员工鉴权、RBAC（F0364）、审计（F0365）、共享数据读写。
 * 权限矩阵（与 /admin 配置页展示一致）：
 *   operations：题库读写、用户/会员只读、工单读写、考试/套餐读写、审计只读
 *   teaching  ：题库读写、工单只读
 *   support   ：工单读写、用户只读
 *   aiops     ：/aiops 配置与评测读写、工单只读
 *   admin     ：全部读写
 */
import { randomBytes, scryptSync } from "node:crypto";
import { getDb, revokeUserTokens, type StaffRole } from "./db";

export interface StaffRow {
  id: number;
  username: string;
  role: StaffRole;
  display_name: string;
}

// ---------- 登录与 token ----------

/** 登录节流策略：15 分钟窗口内 5 次失败即锁定 15 分钟（按 staff_id 记账，不信任客户端头）。 */
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60_000;

interface LoginAttemptRow {
  failed_attempts: number;
  window_started_at: string;
  locked_until: string | null;
}

function loginAttemptRow(staffId: number): LoginAttemptRow | undefined {
  return getDb()
    .prepare("SELECT failed_attempts, window_started_at, locked_until FROM staff_login_attempts WHERE staff_id = ?")
    .get(staffId) as LoginAttemptRow | undefined;
}

export function staffLoginRetryAfter(staffId: number, now = new Date()): number | null {
  const row = loginAttemptRow(staffId);
  if (!row?.locked_until) return null;
  const remainingMs = new Date(row.locked_until).getTime() - now.getTime();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : null;
}

export function recordFailedStaffLogin(staffId: number, now = new Date()): number | null {
  const row = loginAttemptRow(staffId);
  const windowActive = row != null && now.getTime() - new Date(row.window_started_at).getTime() < LOGIN_WINDOW_MS;
  const failedAttempts = windowActive ? row!.failed_attempts + 1 : 1;
  const windowStartedAt = windowActive ? row!.window_started_at : now.toISOString();
  const lockedUntil = failedAttempts >= LOGIN_MAX_FAILURES
    ? new Date(now.getTime() + LOGIN_LOCK_MS).toISOString()
    : null;
  getDb()
    .prepare(
      `INSERT INTO staff_login_attempts (staff_id, failed_attempts, window_started_at, locked_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(staff_id) DO UPDATE SET
         failed_attempts = excluded.failed_attempts,
         window_started_at = excluded.window_started_at,
         locked_until = excluded.locked_until`,
    )
    .run(staffId, failedAttempts, windowStartedAt, lockedUntil);
  return lockedUntil ? Math.ceil(LOGIN_LOCK_MS / 1000) : null;
}

export function clearFailedStaffLogins(staffId: number): void {
  getDb().prepare("DELETE FROM staff_login_attempts WHERE staff_id = ?").run(staffId);
}

export function verifyStaffLogin(
  username: string,
  password: string,
  now = new Date(),
): { ok: true; token: string; staff: StaffRow } | { ok: false; message: string; retryAfterSeconds?: number } {
  const row = getDb()
    .prepare("SELECT id, username, password_hash, salt, role, display_name FROM staff WHERE username = ?")
    .get(username) as
    | { id: number; username: string; password_hash: string; salt: string; role: StaffRole; display_name: string }
    | undefined;
  // 用户名不存在也做一次哈希，避免时序差异暴露账号是否存在
  const hash = scryptSync(password, row?.salt ?? "decoy-salt", 32).toString("hex");
  if (row) {
    const lockedFor = staffLoginRetryAfter(row.id, now);
    if (lockedFor != null) {
      return { ok: false, message: "尝试次数过多，账号已临时锁定。", retryAfterSeconds: lockedFor };
    }
  }
  if (!row || row.password_hash !== hash) {
    // 未知用户名不落库，避免攻击者用任意用户名撑大表
    const lockedFor = row ? recordFailedStaffLogin(row.id, now) : null;
    return lockedFor != null
      ? { ok: false, message: "尝试次数过多，账号已临时锁定。", retryAfterSeconds: lockedFor }
      : { ok: false, message: "用户名或密码不正确。" };
  }
  clearFailedStaffLogins(row.id);
  const token = randomBytes(24).toString("hex");
  getDb()
    .prepare(
      "INSERT INTO staff_tokens (token, staff_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .run(token, row.id, new Date().toISOString(), new Date(Date.now() + 12 * 3_600_000).toISOString());
  return {
    ok: true,
    token,
    staff: { id: row.id, username: row.username, role: row.role, display_name: row.display_name },
  };
}

export function staffFromToken(token: string | null): StaffRow | null {
  if (!token) return null;
  return (getDb()
    .prepare(
      `SELECT s.id, s.username, s.role, s.display_name
       FROM staff_tokens t JOIN staff s ON s.id = t.staff_id
       WHERE t.token = ? AND t.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as StaffRow | undefined) ?? null;
}

export function revokeStaffToken(token: string): void {
  getDb().prepare("DELETE FROM staff_tokens WHERE token = ?").run(token);
}

// ---------- RBAC ----------

const READ_ALL: StaffRole[] = ["operations", "teaching", "support", "aiops", "admin"];

/** 能力 → 允许角色（F0364 矩阵的服务端事实源） */
const CAPABILITIES: Record<string, StaffRole[]> = {
  "bank:read": READ_ALL,
  "bank:write": ["operations", "teaching", "admin"],
  "users:read": ["operations", "support", "admin"],
  "tickets:read": READ_ALL,
  "tickets:write": ["operations", "support", "admin"],
  "config:read": READ_ALL,
  "config:write": ["operations", "admin"],
  "content:read": ["operations", "teaching", "aiops", "admin"],
  "content:write": ["operations", "teaching", "admin"],
  "flags:write": ["operations", "admin"],
  "audit:read": ["operations", "admin"],
  "aiops:read": ["aiops", "admin"],
  "aiops:write": ["aiops", "admin"],
};

export function can(role: StaffRole, capability: string): boolean {
  return CAPABILITIES[capability]?.includes(role) ?? false;
}

export interface AuthedStaff {
  staff: StaffRow;
  token: string;
}

/** 从请求解析员工；capability 不满足时返回 null（调用方回 403 并记审计） */
export function authStaff(req: Request, capability: string): { staff: StaffRow; token: string; forbidden?: false } | { staff: null; token: null; forbidden: boolean } {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const staff = staffFromToken(token);
  if (!staff || !token) return { staff: null, token: null, forbidden: false };
  if (!can(staff.role, capability)) return { staff: null, token: null, forbidden: true };
  return { staff, token, forbidden: false };
}

// ---------- 审计（F0365：服务端只增日志） ----------

export function audit(staff: StaffRow | null, action: string, role?: StaffRole): void {
  getDb()
    .prepare("INSERT INTO audit_log (at, actor, role, action) VALUES (?, ?, ?, ?)")
    .run(
      new Date().toISOString(),
      staff?.display_name ?? staff?.username ?? "匿名",
      role ?? staff?.role ?? "anonymous",
      action,
    );
}

export function listAudit(limit = 100): Array<{ at: string; actor: string; role: string; action: string }> {
  return getDb()
    .prepare("SELECT at, actor, role, action FROM audit_log ORDER BY id DESC LIMIT ?")
    .all(limit) as Array<{ at: string; actor: string; role: string; action: string }>;
}

// ---------- 题库状态（服务端真源；下线题不再进组卷） ----------

export type QuestionStatus = "草稿" | "审核" | "已发布" | "已下线";

export function getQuestionStatus(qid: string): QuestionStatus | null {
  const row = getDb().prepare("SELECT status FROM question_status WHERE qid = ?").get(qid) as
    | { status: QuestionStatus }
    | undefined;
  return row?.status ?? null;
}

export function setQuestionStatus(
  qid: string,
  status: QuestionStatus,
  staff: StaffRow,
): void {
  getDb()
    .prepare(
      `INSERT INTO question_status (qid, status, updated_by, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(qid) DO UPDATE SET status = excluded.status, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .run(qid, status, staff.username, new Date().toISOString());
  audit(staff, `题目 ${qid} 状态 → ${status}`);
}

/** 已下线题目 ID（组卷过滤用，公开只读） */
export function disabledQuestionIds(): string[] {
  return (
    getDb()
      .prepare("SELECT qid FROM question_status WHERE status = '已下线'")
      .all() as Array<{ qid: string }>
  ).map((r) => r.qid);
}

export function saveCustomQuestion(
  qid: string,
  payload: unknown,
  staff: StaffRow,
): void {
  getDb()
    .prepare(
      `INSERT INTO questions_custom (qid, payload, created_by, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(qid) DO UPDATE SET payload = excluded.payload, created_by = excluded.created_by`,
    )
    .run(qid, JSON.stringify(payload), staff.username, new Date().toISOString());
  setQuestionStatus(qid, "草稿", staff);
}

export function listCustomQuestions(): Array<{ qid: string; payload: Record<string, unknown> }> {
  return (getDb()
    .prepare("SELECT qid, payload FROM questions_custom ORDER BY qid")
    .all() as Array<{ qid: string; payload: string }>).map((r) => ({
    qid: r.qid,
    payload: JSON.parse(r.payload) as Record<string, unknown>,
  }));
}

// ---------- 用户运营：状态/补偿（F0337/F0339） ----------

export function getUserAdminState(userId: number): { status: string; risk_note: string | null; updated_at: string } {
  const row = getDb().prepare("SELECT status, risk_note, updated_at FROM user_admin_state WHERE user_id = ?").get(userId) as { status: string; risk_note: string | null; updated_at: string } | undefined;
  return row ?? { status: "正常", risk_note: null, updated_at: "" };
}

export function setUserAdminState(userId: number, status: "正常" | "封禁" | "风险标记", note: string, staff: StaffRow): void {
  getDb().prepare(
    "INSERT INTO user_admin_state (user_id, status, risk_note, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, risk_note=excluded.risk_note, updated_at=excluded.updated_at",
  ).run(userId, status, note || null, new Date().toISOString());
  if (status === "封禁") revokeUserTokens(userId);
  audit(staff, `用户 #${userId} 状态 → ${status}${note ? `（${note}）` : ""}${status === "封禁" ? "；已撤销全部会话" : ""}`);
}

/**
 * F0339 人工补偿：除记录台账外，必须真实累计到用户权益，
 * 否则用户侧看不到任何变化，补偿等于没发。
 */
export function addCompensation(userId: number, kind: "时长" | "额度", amount: number, reason: string, staff: StaffRow): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO user_compensations (user_id, kind, amount, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, kind, amount, reason, staff.username, now);
    db.prepare(
      `INSERT INTO user_entitlements (user_id, bonus_days, bonus_quota, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         bonus_days = bonus_days + excluded.bonus_days,
         bonus_quota = bonus_quota + excluded.bonus_quota,
         updated_at = excluded.updated_at`,
    ).run(userId, kind === "时长" ? amount : 0, kind === "额度" ? amount : 0, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(staff, `用户 #${userId} 补偿${kind} ${amount}${kind === "时长" ? "天" : "次"}（${reason}）`);
}

/** 用户侧读取已发放的补偿权益（F0339）。 */
export function userEntitlements(userId: number): { bonusDays: number; bonusQuota: number } {
  const row = getDb()
    .prepare("SELECT bonus_days, bonus_quota FROM user_entitlements WHERE user_id = ?")
    .get(userId) as { bonus_days: number; bonus_quota: number } | undefined;
  return { bonusDays: row?.bonus_days ?? 0, bonusQuota: row?.bonus_quota ?? 0 };
}

export function listCompensations(userId: number): Array<{ kind: string; amount: number; reason: string; created_by: string; created_at: string }> {
  return getDb().prepare("SELECT kind, amount, reason, created_by, created_at FROM user_compensations WHERE user_id = ? ORDER BY id DESC").all(userId) as unknown as Array<{ kind: string; amount: number; reason: string; created_by: string; created_at: string }>;
}

// ---------- 工单 / 考试 / 套餐 / 用户反馈 ----------

export interface Ticket {
  id: number;
  category: string;
  type: string;
  text: string;
  has_screenshot: number;
  status: string;
  created_at: string;
}

export function listTickets(): Ticket[] {
  return getDb()
    .prepare("SELECT * FROM tickets ORDER BY id DESC LIMIT 200")
    .all() as unknown as Ticket[];
}

export function createTicket(input: {
  category: string;
  type: string;
  text: string;
  hasScreenshot: boolean;
}): number {
  const result = getDb()
    .prepare(
      "INSERT INTO tickets (category, type, text, has_screenshot, status, created_at) VALUES (?, ?, ?, ?, '待处理', ?)",
    )
    .run(input.category, input.type, input.text, input.hasScreenshot ? 1 : 0, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function setTicketStatus(id: number, status: string, staff: StaffRow): void {
  getDb().prepare("UPDATE tickets SET status = ? WHERE id = ?").run(status, id);
  audit(staff, `工单 #${id} 状态 → ${status}`);
}

export function listExams(): Array<{ id: number; name: string; region: string; date: string; subjects: string }> {
  return getDb().prepare("SELECT * FROM exams ORDER BY id DESC").all() as Array<{
    id: number;
    name: string;
    region: string;
    date: string;
    subjects: string;
  }>;
}

export function addExam(e: { name: string; region: string; date: string; subjects: string }, staff: StaffRow): void {
  getDb()
    .prepare("INSERT INTO exams (name, region, date, subjects) VALUES (?, ?, ?, ?)")
    .run(e.name, e.region, e.date, e.subjects);
  audit(staff, `新增考试批次 ${e.name}`);
}

export function listPlans(): Array<{ id: number; name: string; price: number; benefits: string }> {
  return getDb().prepare("SELECT * FROM plans ORDER BY id").all() as Array<{
    id: number;
    name: string;
    price: number;
    benefits: string;
  }>;
}

export function addPlan(p: { name: string; price: number; benefits: string }, staff: StaffRow): void {
  getDb()
    .prepare("INSERT INTO plans (name, price, benefits) VALUES (?, ?, ?)")
    .run(p.name, p.price, p.benefits);
  audit(staff, `新增会员套餐 ${p.name}`);
}

// ---------- 职位库（F0352 批量导入 / F0354 来源 / F0355 历史数据） ----------

export interface PositionRow {
  qid: string;
  name: string;
  department: string;
  region: string;
  unit_level: string;
  recruiting: number;
  min_education: string;
  major_categories: string;
  political_requirement: string;
  requires_grassroots: number;
  fresh_only: number;
  history: string;
  source_name: string;
  source_file: string;
  source_updated_at: string;
}

export function listPositions(): PositionRow[] {
  return getDb()
    .prepare("SELECT * FROM job_positions ORDER BY qid")
    .all() as unknown as PositionRow[];
}

export interface PositionChange {
  qid: string;
  name: string;
  field: "招录人数" | "学历要求" | "专业要求" | "来源更新时间";
  before: string;
  after: string;
}

/**
 * F0275 职位变更检测：导入前后逐字段对比，只报确定性差异。
 * 供收藏该职位的用户获得变更提醒，不做任何推测性解读。
 */
export function detectPositionChanges(rows: Array<Record<string, unknown>>): PositionChange[] {
  const changes: PositionChange[] = [];
  const db = getDb();
  for (const row of rows) {
    const qid = String(row.id ?? "").trim();
    if (qid === "") continue;
    const before = db
      .prepare("SELECT name, recruiting, min_education, major_categories, source_updated_at FROM job_positions WHERE qid = ?")
      .get(qid) as { name: string; recruiting: number; min_education: string; major_categories: string; source_updated_at: string } | undefined;
    if (!before) continue;
    const name = String(row.name ?? before.name);
    const push = (field: PositionChange["field"], left: string, right: string): void => {
      if (left !== right) changes.push({ qid, name, field, before: left, after: right });
    };
    push("招录人数", String(before.recruiting), String(Number(row.recruiting)));
    push("学历要求", before.min_education, String(row.minEducation ?? ""));
    const nextCategories = Array.isArray(row.majorCategories) ? row.majorCategories.map(String) : [];
    push("专业要求", (JSON.parse(before.major_categories) as string[]).join("、"), nextCategories.join("、"));
    push("来源更新时间", before.source_updated_at, String(row.sourceUpdatedAt ?? ""));
  }
  return changes;
}

export function recordPositionChanges(changes: PositionChange[]): void {
  if (changes.length === 0) return;
  const insert = getDb().prepare(
    "INSERT INTO position_changes (qid, name, field, before_value, after_value, detected_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const now = new Date().toISOString();
  for (const change of changes) insert.run(change.qid, change.name, change.field, change.before, change.after, now);
}

/** 只返回用户收藏职位的变更，避免把整库噪音推给用户。 */
export function listPositionChangesFor(qids: string[], limit = 20): Array<PositionChange & { detectedAt: string }> {
  if (qids.length === 0) return [];
  const placeholders = qids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT qid, name, field, before_value, after_value, detected_at FROM position_changes WHERE qid IN (${placeholders}) ORDER BY id DESC LIMIT ?`)
    .all(...qids, limit) as unknown as Array<{ qid: string; name: string; field: PositionChange["field"]; before_value: string; after_value: string; detected_at: string }>;
  return rows.map((row) => ({ qid: row.qid, name: row.name, field: row.field, before: row.before_value, after: row.after_value, detectedAt: row.detected_at }));
}

export function upsertPositions(
  rows: Array<Record<string, unknown>>,
  staff: StaffRow,
): { inserted: number; problems: string[] } {
  const problems: string[] = [];
  let inserted = 0;
  const ins = getDb().prepare(
    `INSERT INTO job_positions
     (qid, name, department, region, unit_level, recruiting, min_education, major_categories,
      political_requirement, requires_grassroots, fresh_only, history, source_name, source_file, source_updated_at)
     VALUES (@qid, @name, @department, @region, @unit_level, @recruiting, @min_education, @major_categories,
      @political_requirement, @requires_grassroots, @fresh_only, @history, @source_name, @source_file, @source_updated_at)
     ON CONFLICT(qid) DO UPDATE SET
      name=excluded.name, department=excluded.department, region=excluded.region,
      unit_level=excluded.unit_level, recruiting=excluded.recruiting, min_education=excluded.min_education,
      major_categories=excluded.major_categories, political_requirement=excluded.political_requirement,
      requires_grassroots=excluded.requires_grassroots, fresh_only=excluded.fresh_only,
      history=excluded.history, source_name=excluded.source_name, source_file=excluded.source_file,
      source_updated_at=excluded.source_updated_at`,
  );
  rows.forEach((r, i) => {
    const get = (k: string): string => String(r[k] ?? "").trim();
    const rowProblems: string[] = [];
    // F0354：来源/文件/更新时间是职位可信度的硬字段，不允许补造默认值。
    for (const key of ["id", "name", "department", "region", "unitLevel", "minEducation", "majorCategories", "sourceName", "sourceFile", "sourceUpdatedAt"]) {
      const value = r[key];
      const emptyArray = Array.isArray(value) && value.length === 0;
      if (get(key) === "" || emptyArray) rowProblems.push(`第 ${i + 1} 条缺少 ${key}`);
    }
    const recruiting = Number(r.recruiting);
    if (!Number.isInteger(recruiting) || recruiting <= 0) rowProblems.push(`第 ${i + 1} 条 recruiting 必须为正整数`);
    const updatedAt = get("sourceUpdatedAt");
    if (updatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) rowProblems.push(`第 ${i + 1} 条 sourceUpdatedAt 必须为 YYYY-MM-DD`);
    // 来源新鲜度不能指向未来，否则会把过期数据伪装成最新公告。
    else if (updatedAt && updatedAt > new Date().toISOString().slice(0, 10)) rowProblems.push(`第 ${i + 1} 条 sourceUpdatedAt 不能晚于今天`);
    const categories = Array.isArray(r.majorCategories)
      ? r.majorCategories.map(String).filter(Boolean)
      : get("majorCategories").split(/[、,，]/).filter(Boolean);
    if (categories.length === 0) rowProblems.push(`第 ${i + 1} 条 majorCategories 不能为空`);
    if (rowProblems.length > 0) {
      problems.push(...rowProblems);
      return;
    }
    ins.run({
      qid: get("id"),
      name: get("name"),
      department: get("department"),
      region: get("region"),
      unit_level: get("unitLevel"),
      recruiting,
      min_education: get("minEducation"),
      major_categories: JSON.stringify(categories),
      political_requirement: get("politicalRequirement") || "群众",
      requires_grassroots: r.requiresGrassroots === true || get("requiresGrassroots") === "true" ? 1 : 0,
      fresh_only: r.freshOnly === true || get("freshOnly") === "true" ? 1 : 0,
      history: JSON.stringify(Array.isArray(r.history) ? r.history : []),
      source_name: get("sourceName"),
      source_file: get("sourceFile"),
      source_updated_at: updatedAt,
    });
    inserted += 1;
  });
  audit(staff, `职位表导入：成功 ${inserted} 条，失败 ${problems.length} 条`);
  return { inserted, problems };
}

export function recordPositionImportRun(input: {
  status: "success" | "rejected";
  sourceName: string;
  sourceFile: string;
  sourceUpdatedAt: string;
  format: string;
  sheetName?: string | null;
  mapping: Record<string, unknown>;
  totalRows: number;
  importedRows: number;
  errors: unknown[];
  staff: StaffRow;
}): void {
  getDb().prepare(
    `INSERT INTO position_import_runs
     (status, source_name, source_file, source_updated_at, format, sheet_name, mapping_json, total_rows, imported_rows, errors_json, actor, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.status,
    input.sourceName,
    input.sourceFile,
    input.sourceUpdatedAt,
    input.format,
    input.sheetName ?? null,
    JSON.stringify(input.mapping),
    input.totalRows,
    input.importedRows,
    JSON.stringify(input.errors),
    input.staff.display_name,
    new Date().toISOString(),
  );
}

export function listPositionImportRuns(): Array<Record<string, unknown>> {
  return getDb().prepare("SELECT * FROM position_import_runs ORDER BY id DESC LIMIT 100").all() as unknown as Array<Record<string, unknown>>;
}

export function listExamNodes(): Array<{ id: number; exam_name: string; kind: string; date: string }> {
  return getDb()
    .prepare("SELECT * FROM exam_nodes ORDER BY date")
    .all() as Array<{ id: number; exam_name: string; kind: string; date: string }>;
}

export function addExamNode(examName: string, kind: string, date: string, staff: StaffRow): void {
  getDb().prepare("INSERT INTO exam_nodes (exam_name, kind, date) VALUES (?, ?, ?)").run(examName, kind, date);
  audit(staff, `新增考试节点 ${examName}·${kind} ${date}`);
}

// ---------- AI 配置与评测（F0366–F0387 的服务端真源） ----------

export function getAiConfig(key: string): unknown {
  const row = getDb().prepare("SELECT value FROM ai_config WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? (JSON.parse(row.value) as unknown) : null;
}

export function setAiConfig(key: string, value: unknown, staff: StaffRow): void {
  getDb()
    .prepare(
      `INSERT INTO ai_config (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), staff.username, new Date().toISOString());
  audit(staff, `AI 配置 ${key} 已更新`);
}

export function recordEvalRun(
  r: { suite: string; passRate: number; failures: string[]; gateVerdict: string },
  staff: StaffRow,
): void {
  getDb()
    .prepare(
      "INSERT INTO eval_runs (suite, pass_rate, failures, gate_verdict, run_by, at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(r.suite, r.passRate, JSON.stringify(r.failures), r.gateVerdict, staff.username, new Date().toISOString());
  audit(staff, `评测 ${r.suite} 通过率 ${r.passRate}%，门禁${r.gateVerdict}`);
}

export function listEvalRuns(): Array<{
  id: number;
  suite: string;
  pass_rate: number;
  failures: string;
  gate_verdict: string;
  run_by: string;
  at: string;
}> {
  return getDb()
    .prepare("SELECT * FROM eval_runs ORDER BY id DESC LIMIT 50")
    .all() as Array<{
    id: number;
    suite: string;
    pass_rate: number;
    failures: string;
    gate_verdict: string;
    run_by: string;
    at: string;
  }>;
}
