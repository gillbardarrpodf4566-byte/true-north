/**
 * 服务端 SQLite（node:sqlite 内建驱动，零原生依赖）。
 * 库文件 data/jianan.db（gitignore）；首启自动建表并写入模拟数据。
 * 路径可用 JIANAN_DB_PATH 覆盖（单测用临时库）。
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

export interface UserRow {
  id: number;
  phone: string;
  nickname: string | null;
  created_at: string;
}

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
  `);
  seedIfEmpty(db);
  globalThis.__jiananDb = db;
  return db;
}

/** 模拟数据（需求：需要数据的在数据库中加入模拟数据） */
function seedIfEmpty(db: DatabaseSync): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (count > 0) return;
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
