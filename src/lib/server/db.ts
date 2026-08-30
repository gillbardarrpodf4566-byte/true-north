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
