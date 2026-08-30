/**
 * 短信验证码服务（F0003 登录 / F0013 重发保护 / F0014 失败原因与恢复路径）。
 *
 * MVP 为 **mock 短信通道**：验证码不经过真实服务商，直接随响应返回（mock.code），
 * 生产接入服务商后删除 mock 字段即可——限流/冷却/过期/锁定逻辑均为真实实现：
 * - 重发冷却 60s（F0013）
 * - 每手机每小时最多 5 条
 * - 有效期 5 分钟；验证错误 5 次锁定 15 分钟（F0014）
 */
import { getDb } from "./db";

const RESEND_COOLDOWN_S = 60;
const HOURLY_LIMIT = 5;
const CODE_TTL_MS = 5 * 60_000;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

export interface SendResult {
  ok: boolean;
  reason?: "cooldown" | "rate_limited";
  retryAfter: number;
  /** mock 短信通道：真实部署删除此字段，验证码由服务商下发 */
  mock?: { code: string };
}

export function sendSmsCode(phone: string, purpose: "login"): SendResult {
  const db = getDb();
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT created_at, expires_at FROM sms_codes
       WHERE phone = ? AND purpose = ? ORDER BY created_at DESC LIMIT 6`,
    )
    .all(phone, purpose) as Array<{ created_at: string; expires_at: string }>;

  if (rows.length > 0) {
    const last = new Date(rows[0]!.created_at).getTime();
    const elapsed = Math.floor((now - last) / 1000);
    if (elapsed < RESEND_COOLDOWN_S) {
      return { ok: false, reason: "cooldown", retryAfter: RESEND_COOLDOWN_S - elapsed };
    }
    const lastHour = rows.filter(
      (r) => now - new Date(r.created_at).getTime() < 3_600_000,
    ).length;
    if (lastHour >= HOURLY_LIMIT) {
      const oldest = rows[HOURLY_LIMIT - 1]!;
      const retryAfter = Math.ceil(
        (new Date(oldest.created_at).getTime() + 3_600_000 - now) / 1000,
      );
      return { ok: false, reason: "rate_limited", retryAfter };
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(
    `INSERT INTO sms_codes (phone, purpose, code, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(phone, purpose, code, new Date(now).toISOString(), new Date(now + CODE_TTL_MS).toISOString());

  return { ok: true, retryAfter: RESEND_COOLDOWN_S, mock: { code } };
}

export type VerifyFailure = "expired" | "wrong" | "locked" | "no_code";

export interface VerifySuccess {
  ok: true;
}
export interface VerifyError {
  ok: false;
  reason: VerifyFailure;
  /** F0014 恢复路径：多久后可重发 */
  canResendIn: number;
  message: string;
}

export function verifySmsCode(
  phone: string,
  purpose: "login",
  code: string,
): VerifySuccess | VerifyError {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, code, expires_at, attempts FROM sms_codes
       WHERE phone = ? AND purpose = ? AND consumed = 0
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phone, purpose) as
    | { id: number; code: string; expires_at: string; attempts: number }
    | undefined;

  const canResendIn = RESEND_COOLDOWN_S;
  if (!row) {
    return {
      ok: false,
      reason: "no_code",
      canResendIn,
      message: "这个手机号没有待验证的验证码，请先重新获取。",
    };
  }

  // F0014：错误次数达上限 → 锁定 15 分钟，期间验证码作废
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    db.prepare("UPDATE sms_codes SET consumed = 1 WHERE id = ?").run(row.id);
    return {
      ok: false,
      reason: "locked",
      canResendIn: Math.ceil(LOCK_MS / 1000),
      message: "错误次数过多，已临时锁定 15 分钟。稍后重新获取验证码即可恢复。",
    };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE sms_codes SET consumed = 1 WHERE id = ?").run(row.id);
    return {
      ok: false,
      reason: "expired",
      canResendIn,
      message: "验证码已过期（有效期 5 分钟）。点击「重新获取」即可，原数据不会丢失。",
    };
  }

  if (row.code !== code) {
    const attempts = row.attempts + 1;
    db.prepare("UPDATE sms_codes SET attempts = ? WHERE id = ?").run(attempts, row.id);
    const left = MAX_VERIFY_ATTEMPTS - attempts;
    return {
      ok: false,
      reason: "wrong",
      canResendIn,
      message:
        left > 0
          ? `验证码不正确，还可尝试 ${left} 次。也可点击「重新获取」换一个。`
          : "验证码不正确，错误次数已达上限，已临时锁定 15 分钟。",
    };
  }

  db.prepare("UPDATE sms_codes SET consumed = 1 WHERE id = ?").run(row.id);
  return { ok: true };
}
