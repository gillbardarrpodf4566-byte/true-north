/**
 * 服务端 SQLite（node:sqlite 内建驱动，零原生依赖）。
 * 库文件 data/jianan.db（gitignore）；首启自动建表并写入模拟数据。
 * 路径可用 JIANAN_DB_PATH 覆盖（单测用临时库）。
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";

export interface UserRow {
  id: number;
  phone: string;
  nickname: string | null;
  created_at: string;
}

export type StaffRole = "operations" | "teaching" | "support" | "aiops" | "admin";

// Next 构建/运行均以仓库根为 cwd；不能用 import.meta.dirname（打包后不存在）
const DB_PATH =
  process.env.JIANAN_DB_PATH ?? join(process.cwd(), "data", "jianan.db");

declare global {
  var __jiananDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  if (globalThis.__jiananDb) return globalThis.__jiananDb;
  mkdirSync(resolve(DB_PATH, ".."), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      nickname TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sms_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS linked_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(provider, provider_subject)
    );
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      granted INTEGER NOT NULL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_codes(phone, purpose);
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff_tokens (
      token TEXT PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff_login_attempts (
      staff_id INTEGER PRIMARY KEY REFERENCES staff(id),
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      window_started_at TEXT NOT NULL,
      locked_until TEXT
    );
    CREATE TABLE IF NOT EXISTS question_status (
      qid TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questions_custom (
      qid TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      has_screenshot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '待处理',
      created_at TEXT NOT NULL,
      -- F0320：内容纠错指向的题目，否则工单无法定位
      target_ref TEXT
    );
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      date TEXT NOT NULL,
      subjects TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      benefits TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS eval_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suite TEXT NOT NULL,
      pass_rate INTEGER NOT NULL,
      failures TEXT NOT NULL,
      gate_verdict TEXT NOT NULL,
      run_by TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS job_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      region TEXT NOT NULL,
      unit_level TEXT NOT NULL,
      recruiting INTEGER NOT NULL,
      min_education TEXT NOT NULL,
      major_categories TEXT NOT NULL,
      political_requirement TEXT NOT NULL,
      requires_grassroots INTEGER NOT NULL,
      fresh_only INTEGER NOT NULL,
      history TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exam_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS job_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_key TEXT NOT NULL,
      qid TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_admin_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      status TEXT NOT NULL DEFAULT '正常',
      risk_note TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_compensations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS essay_content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      status TEXT NOT NULL,
      bundle_json TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      ticket_ref TEXT,
      supersedes_revision INTEGER,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_by TEXT,
      published_at TEXT,
      UNIQUE(question_id, revision)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_published
      ON essay_content_versions(question_id) WHERE status = 'published';
    CREATE TABLE IF NOT EXISTS qualification_rule_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revision INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL,
      rules_json TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_by TEXT,
      published_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_published
      ON qualification_rule_versions(status) WHERE status = 'published';
    CREATE TABLE IF NOT EXISTS position_import_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_updated_at TEXT NOT NULL,
      format TEXT NOT NULL,
      sheet_name TEXT,
      mapping_json TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      imported_rows INTEGER NOT NULL,
      errors_json TEXT NOT NULL,
      actor TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS external_import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_key TEXT NOT NULL,
      kind TEXT NOT NULL,
      source_label TEXT NOT NULL,
      content_digest TEXT NOT NULL,
      parser_version TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(owner_key, kind, content_digest)
    );
    CREATE TABLE IF NOT EXISTS ai_invocations (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      producer_kind TEXT NOT NULL,
      feature TEXT NOT NULL,
      model_version TEXT,
      prompt_version TEXT,
      schema_version TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_entitlements (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      bonus_days INTEGER NOT NULL DEFAULT 0,
      bonus_quota INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS position_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qid TEXT NOT NULL,
      name TEXT NOT NULL,
      field TEXT NOT NULL,
      before_value TEXT NOT NULL,
      after_value TEXT NOT NULL,
      detected_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_position_changes_qid ON position_changes(qid);
    CREATE TABLE IF NOT EXISTS ai_feedback_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER,
      invocation_id TEXT,
      category TEXT NOT NULL,
      sanitized_excerpt TEXT NOT NULL,
      redaction_version TEXT NOT NULL,
      pii_categories TEXT NOT NULL,
      provenance_status TEXT NOT NULL,
      review_status TEXT NOT NULL,
      promoted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  migrate(db);
  seedIfEmpty(db);
  globalThis.__jiananDb = db;
  return db;
}

/** 既有库的增量迁移：CREATE TABLE IF NOT EXISTS 不会为已存在的表补列。 */
function migrate(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(tickets)").all() as unknown as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "target_ref")) {
    db.exec("ALTER TABLE tickets ADD COLUMN target_ref TEXT");
  }
}

/** 模拟数据（需求：需要数据的在数据库中加入模拟数据） */
function seedIfEmpty(db: DatabaseSync): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (count === 0) {
    const ins = db.prepare(
      "INSERT INTO users (phone, nickname, created_at) VALUES (?, ?, ?)",
    );
    const now = new Date().toISOString();
    ins.run("13800000001", "追光者", now);
    ins.run("13800000002", "岸上人", now);
    ins.run("13800000003", null, now);
  }
  // 旧版本创建过的公开 demo token 必须在每次启动时撤销，不能保留到生产库。
  db.prepare("DELETE FROM auth_tokens WHERE token = ?").run("demo-token-13800000001");

  // 员工账号不再内置默认口令：仅当 staff 为空且显式配置了引导账号时创建。
  // JIANAN_BOOTSTRAP_STAFF_JSON=[{"username":"...","password":"...","role":"admin","displayName":"..."}]
  bootstrapStaff(db);

  const ticketCount = (db.prepare("SELECT COUNT(*) AS n FROM tickets").get() as { n: number }).n;
  if (ticketCount === 0) {
    const ins = db.prepare(
      "INSERT INTO tickets (category, type, text, has_screenshot, status, created_at) VALUES (?, ?, ?, ?, '待处理', ?)",
    );
    const now = new Date().toISOString();
    ins.run("解析错误", "问题", "导入华图截图时「常识判断」得分识别成了题数。", 1, now);
    ins.run("诊断不准", "建议", "诊断说资料分析是速度问题，但我感觉是读题慢。", 0, now);
    ins.run("其他", "问题", "夜间模式下错题本卡片边框几乎看不见。", 0, now);
  }

  if ((db.prepare("SELECT COUNT(*) AS n FROM exams").get() as { n: number }).n === 0) {
    db.prepare("INSERT INTO exams (name, region, date, subjects) VALUES (?, ?, ?, ?)").run(
      "2026年国考",
      "全国",
      "2026-11-29",
      "行测+申论",
    );
  }
  if ((db.prepare("SELECT COUNT(*) AS n FROM plans").get() as { n: number }).n === 0) {
    const ins = db.prepare("INSERT INTO plans (name, price, benefits) VALUES (?, ?, ?)");
    ins.run("见岸 Pro 月度", 39, "无限诊断 / 全模块训练");
    ins.run("见岸 Pro 年度", 328, "月度全部权益 + 周复盘深度版");
  }
  if ((db.prepare("SELECT COUNT(*) AS n FROM ai_config").get() as { n: number }).n === 0) {
    const ins = db.prepare("INSERT INTO ai_config (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)");
    const now = new Date().toISOString();
    ins.run("routing", JSON.stringify({ parse: "mock-parse-v1", diagnose: "mock-diag-v1", coach: "mock-coach-v1" }), "system", now);
    ins.run("daily_budget", "500000", "system", now);
    ins.run(
      "prompt_versions",
      JSON.stringify([
        { v: "parse-prompt v1.0", status: "已发布", note: "初始解析提示词" },
        { v: "diagnosis-prompt v1.0", status: "已发布", note: "机会排序判据（GAP-8）" },
        { v: "parse-prompt v1.1", status: "草稿", note: "缺失字段表述增强" },
      ]),
      "system",
      now,
    );
    ins.run(
      "schema_versions",
      JSON.stringify([{ v: "parse-schema v1.0", note: "模块/得分/题数/用时/置信度" }]),
      "system",
      now,
    );
    ins.run(
      "essay_rubric_check",
      JSON.stringify({ note: "申论 Rubric 内置于 src/lib/essay/bank.ts；后台维护入口见 /admin 申论管理" }),
      "system",
      now,
    );
    ins.run("notices", JSON.stringify([{ id: "n1", title: "本周复盘已上线", body: "看看哪些投入真正有效。", status: "草稿" }]), "system", now);
    // F0357：kind 必须与消息引擎实际消费的类型一致，否则模板永远不生效
    ins.run("message_templates", JSON.stringify([
      { id: "t1", kind: "复习到期", template: "「{knowledgePoint}」到复测时间了" },
      { id: "t2", kind: "进步", template: "{metric}有稳定进步" },
    ]), "system", now);
    ins.run("feature_flags", JSON.stringify([{ key: "essay_coach", rollout: "all", percent: 100 }, { key: "score_forecast", rollout: "percent", percent: 50 }]), "system", now);
    ins.run("rubric_calibrations", JSON.stringify([]), "system", now);
  }

  // 职位库种子（模拟数据，F0352/F0354：来源文件 + 更新时间）
  if ((db.prepare("SELECT COUNT(*) AS n FROM job_positions").get() as { n: number }).n === 0) {
    const ins = db.prepare(
      `INSERT INTO job_positions
       (qid, name, department, region, unit_level, recruiting, min_education, major_categories,
        political_requirement, requires_grassroots, fresh_only, history, source_name, source_file, source_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of SEED_POSITIONS_FOR_DB) {
      ins.run(
        p.id,
        p.name,
        p.department,
        p.region,
        p.unitLevel,
        p.recruiting,
        p.minEducation,
        JSON.stringify(p.majorCategories),
        p.politicalRequirement,
        p.requiresGrassroots ? 1 : 0,
        p.freshOnly ? 1 : 0,
        JSON.stringify(p.history),
        p.source.name,
        p.source.file,
        p.source.updatedAt,
      );
    }
  }
  if ((db.prepare("SELECT COUNT(*) AS n FROM exam_nodes").get() as { n: number }).n === 0) {
    const ins = db.prepare("INSERT INTO exam_nodes (exam_name, kind, date) VALUES (?, ?, ?)");
    ins.run("2026年国考", "报名", "2026-10-15");
    ins.run("2026年国考", "审核", "2026-10-26");
    ins.run("2026年国考", "缴费", "2026-11-05");
    ins.run("2026年国考", "准考证", "2026-11-24");
    ins.run("2026年国考", "笔试", "2026-11-29");
  }
}

/** 与 src/lib/jobs/engine.ts 的 SEED_POSITIONS 同源（避免跨端导入 server 文件） */
const SEED_POSITIONS_FOR_DB = [
  {
    id: "job-001", name: "市税务局一级行政执法员", department: "市税务局", region: "广州市",
    unitLevel: "市级", recruiting: 2, minEducation: "本科",
    majorCategories: ["经济学类", "计算机类"], politicalRequirement: "中共党员",
    requiresGrassroots: false, freshOnly: false,
    history: [
      { year: 2024, recruited: 2, interviewScore: 131.2, applicants: 96 },
      { year: 2025, recruited: 3, interviewScore: 128.6, applicants: 118 },
    ],
    source: { name: "2026 国考职位表（官方）·演示数据", file: "2026-gk-positions.xlsx", updatedAt: "2026-08-15", origin: "simulated" },
  },
  {
    id: "job-002", name: "区统计局统计分析岗", department: "区统计局", region: "佛山市",
    unitLevel: "区县级", recruiting: 1, minEducation: "本科",
    majorCategories: ["统计学类", "经济学类"], politicalRequirement: "群众",
    requiresGrassroots: false, freshOnly: true,
    history: [
      { year: 2024, recruited: 1, interviewScore: 124.5, applicants: 61 },
      { year: 2025, recruited: 1, interviewScore: 126.8, applicants: 74 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20", origin: "simulated" },
  },
  {
    id: "job-003", name: "街道办综合管理岗", department: "某街道办事处", region: "广州市",
    unitLevel: "乡镇街道", recruiting: 3, minEducation: "本科",
    majorCategories: ["不限"], politicalRequirement: "群众",
    requiresGrassroots: true, freshOnly: false,
    history: [
      { year: 2024, recruited: 3, interviewScore: 118.9, applicants: 142 },
      { year: 2025, recruited: 2, interviewScore: 121.4, applicants: 158 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20", origin: "simulated" },
  },
  {
    id: "job-004", name: "市委办公室文秘岗", department: "市委办公室", region: "武汉市",
    unitLevel: "市级", recruiting: 1, minEducation: "硕士",
    majorCategories: ["中国语言文学类", "法学类"], politicalRequirement: "中共党员",
    requiresGrassroots: true, freshOnly: false,
    history: [{ year: 2025, recruited: 1, interviewScore: 138.2, applicants: 203 }],
    source: { name: "2026 选调职位表（官方）·演示数据", file: "2026-xd-positions.xlsx", updatedAt: "2026-08-25", origin: "simulated" },
  },
  {
    id: "job-005", name: "县市场监管局执法岗", department: "县市场监管局", region: "韶关市",
    unitLevel: "乡镇街道", recruiting: 4, minEducation: "大专",
    majorCategories: ["不限"], politicalRequirement: "群众",
    requiresGrassroots: false, freshOnly: false,
    history: [
      { year: 2024, recruited: 4, interviewScore: 108.3, applicants: 88 },
      { year: 2025, recruited: 5, interviewScore: 110.1, applicants: 95 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2025-12-30", origin: "simulated" },
  },
  {
    id: "job-006", name: "市大数据管理局信息岗", department: "市大数据管理局", region: "深圳市",
    unitLevel: "市级", recruiting: 2, minEducation: "本科",
    majorCategories: ["计算机类", "统计学类"], politicalRequirement: "共青团员",
    requiresGrassroots: false, freshOnly: false,
    history: [
      { year: 2024, recruited: 2, interviewScore: 134.7, applicants: 187 },
      { year: 2025, recruited: 2, interviewScore: 136.1, applicants: 210 },
    ],
    source: { name: "2026 市考职位表（官方）·演示数据", file: "2026-ds-positions.xlsx", updatedAt: "2026-08-28", origin: "simulated" },
  },
];

export interface BootstrapStaffEntry {
  username: string;
  password: string;
  role: StaffRole;
  displayName: string;
}

const STAFF_ROLES: StaffRole[] = ["operations", "teaching", "support", "aiops", "admin"];

/**
 * 员工账号只能通过带外配置一次性引导，绝不内置默认口令。
 * 未配置时 staff 表保持为空，后台登录一律失败（失败关闭）。
 */
export function parseBootstrapStaff(raw: string | undefined): BootstrapStaffEntry[] {
  if (!raw || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JIANAN_BOOTSTRAP_STAFF_JSON 不是合法 JSON。");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JIANAN_BOOTSTRAP_STAFF_JSON 必须是非空数组。");
  }
  const entries = parsed.map((item, i) => {
    const row = item as Partial<BootstrapStaffEntry>;
    const username = typeof row.username === "string" ? row.username.trim() : "";
    const password = typeof row.password === "string" ? row.password : "";
    const displayName = typeof row.displayName === "string" ? row.displayName.trim() : "";
    if (username === "") throw new Error(`引导员工第 ${i + 1} 条缺少 username。`);
    if (password.length < 12) throw new Error(`引导员工「${username}」口令至少 12 位。`);
    if (!row.role || !STAFF_ROLES.includes(row.role)) {
      throw new Error(`引导员工「${username}」role 必须是 ${STAFF_ROLES.join("/")}。`);
    }
    if (displayName === "") throw new Error(`引导员工「${username}」缺少 displayName。`);
    return { username, password, role: row.role, displayName };
  });
  const unique = new Set(entries.map((entry) => entry.username));
  if (unique.size !== entries.length) throw new Error("引导员工 username 不能重复。");
  return entries;
}

/** 历史版本内置过的演示口令：一旦在库中发现同口令账号，视为已泄露并连带 token 一起清除。 */
const LEAKED_DEMO_STAFF: Array<{ username: string; password: string }> = [
  { username: "ops01", password: "Ops@123456" },
  { username: "teacher01", password: "Teach@123456" },
  { username: "support01", password: "Support@123456" },
  { username: "aiops01", password: "Aiops@123456" },
  { username: "boss", password: "Boss@123456" },
];

function purgeLeakedDemoStaff(db: DatabaseSync): void {
  for (const leaked of LEAKED_DEMO_STAFF) {
    const row = db
      .prepare("SELECT id, password_hash, salt FROM staff WHERE username = ?")
      .get(leaked.username) as { id: number; password_hash: string; salt: string } | undefined;
    if (!row) continue;
    if (scryptSync(leaked.password, row.salt, 32).toString("hex") !== row.password_hash) continue;
    db.prepare("DELETE FROM staff_tokens WHERE staff_id = ?").run(row.id);
    db.prepare("DELETE FROM staff_login_attempts WHERE staff_id = ?").run(row.id);
    db.prepare("DELETE FROM staff WHERE id = ?").run(row.id);
  }
}

function bootstrapStaff(db: DatabaseSync): void {
  purgeLeakedDemoStaff(db);
  const staffCount = (db.prepare("SELECT COUNT(*) AS n FROM staff").get() as { n: number }).n;
  if (staffCount > 0) return;
  const entries = parseBootstrapStaff(process.env.JIANAN_BOOTSTRAP_STAFF_JSON);
  if (entries.length === 0) return;
  const insert = db.prepare(
    "INSERT INTO staff (username, password_hash, salt, role, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const now = new Date().toISOString();
  for (const entry of entries) {
    const salt = randomBytes(16).toString("hex");
    insert.run(
      entry.username,
      scryptSync(entry.password, salt, 32).toString("hex"),
      salt,
      entry.role,
      entry.displayName,
      now,
    );
  }
}

export function getDb(): DatabaseSync {
  return open();
}

/** 关闭连接（测试清理用；Windows 下必须先关再删库文件） */
export function closeDb(): void {
  if (globalThis.__jiananDb) {
    globalThis.__jiananDb.close();
    globalThis.__jiananDb = undefined;
  }
}

export function findUserByPhone(phone: string): UserRow | undefined {
  return open()
    .prepare("SELECT id, phone, nickname, created_at FROM users WHERE phone = ?")
    .get(phone) as UserRow | undefined;
}

export function createUser(phone: string): UserRow {
  const db = open();
  db.prepare("INSERT INTO users (phone, created_at) VALUES (?, ?)").run(
    phone,
    new Date().toISOString(),
  );
  return findUserByPhone(phone)!;
}

export function isUserBanned(userId: number): boolean {
  const row = open()
    .prepare("SELECT status FROM user_admin_state WHERE user_id = ?")
    .get(userId) as { status: string } | undefined;
  return row?.status === "封禁";
}

export function revokeUserTokens(userId: number): void {
  open().prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(userId);
}

export function issueToken(userId: number): { token: string; expiresAt: string } {
  if (isUserBanned(userId)) throw new Error("ACCOUNT_BANNED");
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  open()
    .prepare(
      "INSERT INTO auth_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .run(token, userId, new Date().toISOString(), expiresAt);
  return { token, expiresAt };
}

export function userFromToken(token: string | null): UserRow | null {
  if (!token) return null;
  const row = open()
    .prepare(
      `SELECT u.id, u.phone, u.nickname, u.created_at
       FROM auth_tokens t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN user_admin_state uas ON uas.user_id = u.id
       WHERE t.token = ? AND t.expires_at > ? AND COALESCE(uas.status, '正常') <> '封禁'`,
    )
    .get(token, new Date().toISOString()) as UserRow | undefined;
  return row ?? null;
}

export function revokeToken(token: string): void {
  open().prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
}

export type LinkedProvider = "wechat" | "apple";

export function linkProvider(userId: number, provider: LinkedProvider, subject: string): void {
  open()
    .prepare(
      "INSERT INTO linked_providers (user_id, provider, provider_subject, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(provider, provider_subject) DO UPDATE SET user_id = excluded.user_id",
    )
    .run(userId, provider, subject, new Date().toISOString());
}

export function unlinkProvider(userId: number, provider: LinkedProvider): void {
  open().prepare("DELETE FROM linked_providers WHERE user_id = ? AND provider = ?").run(userId, provider);
}

export function deleteUserData(userId: number): void {
  const db = open();
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM linked_providers WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_permissions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM job_favorites WHERE user_key = ?").run(`user:${userId}`);
    db.prepare("DELETE FROM user_admin_state WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_compensations WHERE user_id = ?").run(userId);
    // 外键约束未开启，权益行必须显式删除，否则注销后残留孤儿数据。
    db.prepare("DELETE FROM user_entitlements WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM external_import_batches WHERE owner_key = ?").run(`user:${userId}`);
    db.prepare("DELETE FROM ai_invocations WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function listLinkedProviders(userId: number): Array<{ provider: LinkedProvider; created_at: string }> {
  return open()
    .prepare("SELECT provider, created_at FROM linked_providers WHERE user_id = ? ORDER BY provider")
    .all(userId) as unknown as Array<{ provider: LinkedProvider; created_at: string }>;
}

export function userByProvider(provider: LinkedProvider, subject: string): UserRow | null {
  return (open()
    .prepare(
      "SELECT u.id, u.phone, u.nickname, u.created_at FROM linked_providers p JOIN users u ON u.id = p.user_id WHERE p.provider = ? AND p.provider_subject = ?",
    )
    .get(provider, subject) as UserRow | undefined) ?? null;
}

export function recordPermission(
  userId: number | null,
  type: "notification" | "album",
  granted: boolean,
): void {
  open()
    .prepare(
      "INSERT INTO user_permissions (user_id, type, granted, at) VALUES (?, ?, ?, ?)",
    )
    .run(userId, type, granted ? 1 : 0, new Date().toISOString());
}

export function saveJobFavorite(userKey: string, qid: string): void {
  open().prepare("INSERT INTO job_favorites (user_key, qid, at) VALUES (?, ?, ?)").run(userKey, qid, new Date().toISOString());
}

export function removeJobFavorite(userKey: string, qid: string): void {
  open().prepare("DELETE FROM job_favorites WHERE user_key = ? AND qid = ?").run(userKey, qid);
}

export function listJobFavorites(userKey: string): string[] {
  return (open().prepare("SELECT qid FROM job_favorites WHERE user_key = ? ORDER BY at DESC").all(userKey) as Array<{ qid: string }>).map((x) => x.qid);
}

export function latestPermission(
  userId: number | null,
  type: "notification" | "album",
): { granted: boolean; at: string } | null {
  const row = open()
    .prepare(
      `SELECT granted, at FROM user_permissions
       WHERE (user_id = ? OR ? IS NULL) AND type = ?
       ORDER BY at DESC LIMIT 1`,
    )
    .get(userId, userId, type) as { granted: number; at: string } | undefined;
  return row ? { granted: row.granted === 1, at: row.at } : null;
}

export function dbFileExists(): boolean {
  return existsSync(DB_PATH);
}
