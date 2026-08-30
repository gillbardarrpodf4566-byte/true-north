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
import { getDb, type StaffRole } from "./db";

export interface StaffRow {
  id: number;
  username: string;
  role: StaffRole;
  display_name: string;
}

// ---------- 登录与 token ----------

export function verifyStaffLogin(
  username: string,
  password: string,
): { ok: true; token: string; staff: StaffRow } | { ok: false; message: string } {
  const row = getDb()
    .prepare("SELECT id, username, password_hash, salt, role, display_name FROM staff WHERE username = ?")
    .get(username) as
    | { id: number; username: string; password_hash: string; salt: string; role: StaffRole; display_name: string }
    | undefined;
  // 用户名不存在也做一次哈希，避免时序差异暴露账号是否存在
  const hash = scryptSync(password, row?.salt ?? "decoy-salt", 32).toString("hex");
  if (!row || row.password_hash !== hash) {
    return { ok: false, message: "用户名或密码不正确。" };
  }
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
}): void {
  getDb()
    .prepare(
      "INSERT INTO tickets (category, type, text, has_screenshot, status, created_at) VALUES (?, ?, ?, ?, '待处理', ?)",
    )
    .run(input.category, input.type, input.text, input.hasScreenshot ? 1 : 0, new Date().toISOString());
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
