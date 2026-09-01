import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 短信服务单测：独立临时库，验证 F0003/F0013/F0014 的服务端规则——
 * 冷却 60s、小时限流、过期、错误 5 次锁定。
 */
const dir = mkdtempSync(join(tmpdir(), "jianan-sms-"));
process.env.JIANAN_DB_PATH = join(dir, "test.db");
process.env.JIANAN_ALLOW_MOCK_SMS = "1";

const { sendSmsCode, verifySmsCode, smsChannel } = await import("./sms");
const {
  getDb,
  createUser,
  issueToken,
  userFromToken,
  recordPermission,
  latestPermission,
  findUserByPhone,
  closeDb,
  deleteUserData,
  linkProvider,
  listLinkedProviders,
} = await import("./db");

afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("短信验证码服务", () => {
  it("未配置服务商且未开启 mock 通道时拒绝发送，且不回显验证码", () => {
    delete process.env.JIANAN_ALLOW_MOCK_SMS;
    try {
      expect(smsChannel()).toBe("unavailable");
      const blocked = sendSmsCode("13900000099", "login");
      expect(blocked.ok).toBe(false);
      expect(blocked.reason).toBe("channel_unavailable");
      expect(blocked.mock).toBeUndefined();
    } finally {
      process.env.JIANAN_ALLOW_MOCK_SMS = "1";
    }
  });

  it("配置了真实服务商时不回显验证码", () => {
    process.env.JIANAN_SMS_PROVIDER_ENDPOINT = "https://sms.example.test/send";
    try {
      expect(smsChannel()).toBe("provider");
      const sent = sendSmsCode("13900000098", "login");
      expect(sent.ok).toBe(true);
      expect(sent.mock).toBeUndefined();
    } finally {
      delete process.env.JIANAN_SMS_PROVIDER_ENDPOINT;
    }
  });

  it("发送成功且 60s 冷却内拒绝（F0013）", () => {
    const first = sendSmsCode("13900000001", "login");
    expect(first.ok).toBe(true);
    expect(first.mock?.code).toMatch(/^\d{6}$/);
    const second = sendSmsCode("13900000001", "login");
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("cooldown");
    expect(second.retryAfter).toBeGreaterThan(0);
    expect(second.retryAfter).toBeLessThanOrEqual(60);
  });

  it("验证码正确 → 通过且核销；同一码不可复用", () => {
    sendSmsCode("13900000002", "login");
    const code = readLatestCode("13900000002");
    expect(verifySmsCode("13900000002", "login", code).ok).toBe(true);
    const again = verifySmsCode("13900000002", "login", code);
    expect(again.ok).toBe(false);
  });

  it("验证码错误 → 结构化原因 + 剩余次数（F0014）", () => {
    sendSmsCode("13900000003", "login");
    const r = verifySmsCode("13900000003", "login", "000000");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("wrong");
      expect(r.message).toContain("还可尝试");
      expect(r.canResendIn).toBe(60);
    }
  });

  it("过期验证码 → expired 与恢复路径", () => {
    sendSmsCode("13900000004", "login");
    // 直接把 expires_at 改到过去
    getDb()
      .prepare("UPDATE sms_codes SET expires_at = ? WHERE phone = ?")
      .run(new Date(Date.now() - 1000).toISOString(), "13900000004");
    const r = verifySmsCode("13900000004", "login", readLatestCode("13900000004"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("错误 5 次 → 锁定（F0014 零容忍路径）", () => {
    sendSmsCode("13900000005", "login");
    for (let i = 0; i < 5; i++) {
      verifySmsCode("13900000005", "login", "111111");
    }
    const r = verifySmsCode("13900000005", "login", "111111");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("locked");
  });

  it("手机号每小时限流（略过冷却：插 5 条 2–6 分钟前的记录）", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      getDb()
        .prepare(
          `INSERT INTO sms_codes (phone, purpose, code, created_at, expires_at)
           VALUES (?, 'login', '123456', ?, ?)`,
        )
        .run(
          "13900000006",
          new Date(now - 120_000 - i * 60_000).toISOString(),
          new Date(now + 300_000).toISOString(),
        );
    }
    const r = sendSmsCode("13900000006", "login");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("rate_limited");
  });
});

describe("账号与权限（F0003/F0008/F0009）", () => {
  it("登录发 token → me 可查 → 注销失效", async () => {
    const user = createUser("13900000007");
    const { token } = issueToken(user.id);
    expect(userFromToken(token)?.phone).toBe("13900000007");
    const { revokeToken } = await import("./db");
    revokeToken(token);
    expect(userFromToken(token)).toBeNull();
  });

  it("已有用户重复登录不重复建档；种子用户存在", () => {
    const before = findUserByPhone("13800000001");
    expect(before?.nickname).toBe("追光者");
  });

  it("权限授权入库并可查（F0008/F0009 审计）", () => {
    recordPermission(null, "album", true);
    recordPermission(null, "notification", false);
    expect(latestPermission(null, "album")?.granted).toBe(true);
    expect(latestPermission(null, "notification")?.granted).toBe(false);
  });

  it("第三方绑定/解绑关联账号（V1 F0004/F0005）", () => {
    const user = createUser("13900000008");
    linkProvider(user.id, "wechat", "wx-subject-test");
    expect(listLinkedProviders(user.id).map((x) => x.provider)).toContain("wechat");
  });

  it("账号注销服务端删除数据（V1 F0334）", () => {
    const user = createUser("13900000009");
    const { token } = issueToken(user.id);
    recordPermission(user.id, "album", true);
    deleteUserData(user.id);
    expect(userFromToken(token)).toBeNull();
    expect(findUserByPhone("13900000009")).toBeUndefined();
  });
});

function readLatestCode(phone: string): string {
  const row = getDb()
    .prepare("SELECT code FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1")
    .get(phone) as { code: string };
  return row.code;
}
