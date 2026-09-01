import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 后台服务端化单测：员工登录（scrypt）、RBAC 矩阵（F0364）、
 * 服务端审计只增（F0365）、题库状态与下线过滤（F0343）。
 */
const dir = mkdtempSync(join(tmpdir(), "jianan-admin-"));
process.env.JIANAN_DB_PATH = join(dir, "test.db");
process.env.JIANAN_BOOTSTRAP_STAFF_JSON = JSON.stringify([
  { username: "unit-ops", password: "UnitOps#2026pass", role: "operations", displayName: "单测运营" },
  { username: "unit-admin", password: "UnitAdmin#2026pass", role: "admin", displayName: "单测管理员" },
  { username: "unit-throttle", password: "UnitThrottle#2026pass", role: "support", displayName: "单测节流" },
]);

const {
  verifyStaffLogin,
  staffFromToken,
  can,
  audit,
  listAudit,
  setQuestionStatus,
  getQuestionStatus,
  disabledQuestionIds,
  addExam,
  listExams,
  createTicket,
  setTicketStatus,
  listTickets,
  setUserAdminState,
  upsertPositions,
  listPositions,
} = await import("./admin");

const { closeDb, createUser, issueToken, userFromToken } = await import("./db");

afterAll(async () => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("员工登录（scrypt + token + 节流）", () => {
  it("带外引导账号可登录并拿到身份", () => {
    const r = verifyStaffLogin("unit-ops", "UnitOps#2026pass");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.staff.role).toBe("operations");
      expect(staffFromToken(r.token)?.display_name).toBe("单测运营");
    }
  });

  it("历史内置演示账号不存在于库中", () => {
    for (const username of ["ops01", "teacher01", "support01", "aiops01", "boss"]) {
      expect(verifyStaffLogin(username, "Ops@123456").ok).toBe(false);
      expect(verifyStaffLogin(username, "Boss@123456").ok).toBe(false);
    }
  });

  it("密码错误拒绝；token 注销后失效", async () => {
    const bad = verifyStaffLogin("unit-ops", "wrong-password");
    expect(bad.ok).toBe(false);
    const r = verifyStaffLogin("unit-admin", "UnitAdmin#2026pass");
    if (r.ok) {
      const { revokeStaffToken } = await import("./admin");
      revokeStaffToken(r.token);
      expect(staffFromToken(r.token)).toBeNull();
    }
  });

  it("窗口内连续 5 次失败后锁定；锁定期内正确口令仍被拒；过期后可登录", async () => {
    const { clearFailedStaffLogins, staffLoginRetryAfter } = await import("./admin");
    const start = new Date("2026-09-01T09:00:00.000Z");
    for (let attempt = 1; attempt <= 4; attempt++) {
      const result = verifyStaffLogin("unit-throttle", "bad-password", new Date(start.getTime() + attempt * 1000));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.retryAfterSeconds).toBeUndefined();
    }
    const fifth = verifyStaffLogin("unit-throttle", "bad-password", new Date(start.getTime() + 5000));
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) expect(fifth.retryAfterSeconds).toBe(900);

    const lockedWithCorrect = verifyStaffLogin("unit-throttle", "UnitThrottle#2026pass", new Date(start.getTime() + 6000));
    expect(lockedWithCorrect.ok).toBe(false);
    if (!lockedWithCorrect.ok) expect(lockedWithCorrect.retryAfterSeconds).toBeGreaterThan(0);

    const afterExpiry = new Date(start.getTime() + 16 * 60_000);
    const unlocked = verifyStaffLogin("unit-throttle", "UnitThrottle#2026pass", afterExpiry);
    expect(unlocked.ok).toBe(true);
    if (unlocked.ok) {
      // 成功登录清空失败计数
      expect(staffLoginRetryAfter(unlocked.staff.id, afterExpiry)).toBeNull();
      clearFailedStaffLogins(unlocked.staff.id);
    }
  });
});

describe("RBAC 矩阵（F0364）", () => {
  it("运营/教研可写题库；客服/AI运营不可", () => {
    expect(can("operations", "bank:write")).toBe(true);
    expect(can("teaching", "bank:write")).toBe(true);
    expect(can("support", "bank:write")).toBe(false);
    expect(can("aiops", "bank:write")).toBe(false);
  });

  it("工单写：客服/运营可，教研/AI运营不可", () => {
    expect(can("support", "tickets:write")).toBe(true);
    expect(can("operations", "tickets:write")).toBe(true);
    expect(can("teaching", "tickets:write")).toBe(false);
    expect(can("aiops", "tickets:write")).toBe(false);
  });

  it("配置写：仅运营/管理员；AI 运营仅 aiops 域", () => {
    expect(can("operations", "config:write")).toBe(true);
    expect(can("aiops", "config:write")).toBe(false);
    expect(can("aiops", "aiops:write")).toBe(true);
    expect(can("operations", "aiops:write")).toBe(false);
  });

  it("审计只读：运营/管理员可见，客服/教研/AI运营不可", () => {
    expect(can("operations", "audit:read")).toBe(true);
    expect(can("admin", "audit:read")).toBe(true);
    expect(can("support", "audit:read")).toBe(false);
    expect(can("teaching", "audit:read")).toBe(false);
    expect(can("aiops", "audit:read")).toBe(false);
  });
});

describe("审计（F0365 只增）与题库下线（F0343）", () => {
  it("题库状态变更写审计；下线题出现在过滤列表", () => {
    const r = verifyStaffLogin("unit-ops", "UnitOps#2026pass");
    if (!r.ok) throw new Error("login failed");
    setQuestionStatus("fa-3", "已下线", r.staff);
    expect(getQuestionStatus("fa-3")).toBe("已下线");
    expect(disabledQuestionIds()).toContain("fa-3");
    // 恢复，避免影响其他数据
    setQuestionStatus("fa-3", "已发布", r.staff);
    expect(disabledQuestionIds()).not.toContain("fa-3");

    const log = listAudit(20);
    expect(log.some((a) => a.action.includes("fa-3") && a.actor === "单测运营")).toBe(true);
  });

  it("匿名越权也进审计", () => {
    audit(null, "越权尝试：测试注入");
    expect(listAudit(5).some((a) => a.action.includes("越权尝试") && a.role === "anonymous")).toBe(true);
  });

  it("封禁会撤销既有 token 且阻止签发新 token", () => {
    const user = createUser("13900000019");
    const token = issueToken(user.id).token;
    expect(userFromToken(token)?.id).toBe(user.id);
    const admin = verifyStaffLogin("unit-admin", "UnitAdmin#2026pass");
    if (!admin.ok) throw new Error("admin login failed");
    setUserAdminState(user.id, "封禁", "测试封禁", admin.staff);
    expect(userFromToken(token)).toBeNull();
    expect(() => issueToken(user.id)).toThrow("ACCOUNT_BANNED");
  });
});

describe("共享数据（考试/套餐/工单）", () => {
  it("考试与套餐读写共享于服务端库", () => {
    const r = verifyStaffLogin("unit-ops", "UnitOps#2026pass");
    if (!r.ok) throw new Error("login failed");
    addExam({ name: "2027年省考", region: "广东", date: "2027-03", subjects: "行测+申论" }, r.staff);
    expect(listExams().some((e) => e.name === "2027年省考")).toBe(true);
  });

  it("工单创建与处理", () => {
    createTicket({ category: "其他", type: "问题", text: "测试工单内容足够长", hasScreenshot: false });
    const t = listTickets()[0]!;
    const r = verifyStaffLogin("unit-admin", "UnitAdmin#2026pass");
    if (!r.ok) throw new Error("login failed");
    setTicketStatus(t.id, "已处理", r.staff);
    expect(listTickets().find((x) => x.id === t.id)?.status).toBe("已处理");
  });

  it("职位批量导入逐行处理，拒绝缺来源的坏行但保留后续有效行（F0352/F0354）", () => {
    const r = verifyStaffLogin("unit-ops", "UnitOps#2026pass");
    if (!r.ok) throw new Error("login failed");
    const before = listPositions().length;
    const out = upsertPositions([
      { id: "bad-row", name: "缺来源职位", department: "测试", region: "广州市", unitLevel: "市级", minEducation: "本科", majorCategories: ["不限"], recruiting: 1 },
      { id: "good-row", name: "有效职位", department: "测试", region: "广州市", unitLevel: "市级", minEducation: "本科", majorCategories: ["不限"], recruiting: 1, sourceName: "测试官方来源", sourceFile: "test.xlsx", sourceUpdatedAt: "2026-08-31" },
    ], r.staff);
    expect(out.inserted).toBe(1);
    expect(out.problems.some((p) => p.includes("sourceName"))).toBe(true);
    expect(listPositions().length).toBe(before + 1);
  });
});
