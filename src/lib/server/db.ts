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
      created_at TEXT NOT NULL
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
  `);
  seedIfEmpty(db);
  globalThis.__jiananDb = db;
  return db;
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
    // 演示 token：便于接口直连调试（GET /api/auth/me，Bearer demo-token-13800000001）
    const row = db.prepare("SELECT id FROM users WHERE phone = ?").get("13800000001") as {
      id: number;
    };
    db.prepare(
      "INSERT INTO auth_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    ).run("demo-token-13800000001", row.id, now, new Date(Date.now() + 30 * 86_400_000).toISOString());
  }

  // 种子员工（模拟数据）：演示账号密码见 docs/05-实现/spec-gaps.md GAP-10
  const staffCount = (db.prepare("SELECT COUNT(*) AS n FROM staff").get() as { n: number }).n;
  if (staffCount === 0) {
    const ins = db.prepare(
      "INSERT INTO staff (username, password_hash, salt, role, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const now = new Date().toISOString();
    const mk = (username: string, password: string, role: StaffRole, name: string): void => {
      const salt = randomBytes(16).toString("hex");
      ins.run(username, scryptSync(password, salt, 32).toString("hex"), salt, role, name, now);
    };
    mk("ops01", "Ops@123456", "operations", "运营小岸");
    mk("teacher01", "Teach@123456", "teaching", "教研阿岸");
    mk("support01", "Support@123456", "support", "客服暖岸");
    mk("aiops01", "Aiops@123456", "aiops", "AI运营零岸");
    mk("boss", "Boss@123456", "admin", "管理员");
  }

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
    source: { name: "2026 国考职位表（官方）", file: "2026-gk-positions.xlsx", updatedAt: "2026-08-15" },
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
    source: { name: "2026 省考职位表（官方）", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20" },
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
    source: { name: "2026 省考职位表（官方）", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20" },
  },
  {
    id: "job-004", name: "市委办公室文秘岗", department: "市委办公室", region: "武汉市",
    unitLevel: "市级", recruiting: 1, minEducation: "硕士",
    majorCategories: ["中国语言文学类", "法学类"], politicalRequirement: "中共党员",
    requiresGrassroots: true, freshOnly: false,
    history: [{ year: 2025, recruited: 1, interviewScore: 138.2, applicants: 203 }],
    source: { name: "2026 选调职位表（官方）", file: "2026-xd-positions.xlsx", updatedAt: "2026-09-01" },
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
    source: { name: "2026 省考职位表（官方）", file: "2026-sk-positions.xlsx", updatedAt: "2025-12-30" },
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
    source: { name: "2026 市考职位表（官方）", file: "2026-ds-positions.xlsx", updatedAt: "2026-08-28" },
  },
];

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

export function issueToken(userId: number): { token: string; expiresAt: string } {
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
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token = ? AND t.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as UserRow | undefined;
  return row ?? null;
}

export function revokeToken(token: string): void {
  open().prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
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
