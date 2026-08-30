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
} = await import("./admin");

afterAll(async () => {
  const { closeDb } = await import("./db");
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("员工登录（scrypt + token）", () => {
  it("种子员工可登录并拿到身份", () => {
    const r = verifyStaffLogin("ops01", "Ops@123456");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.staff.role).toBe("operations");
      expect(staffFromToken(r.token)?.display_name).toBe("运营小岸");
    }
  });

  it("密码错误拒绝；token 注销后失效", async () => {
    const bad = verifyStaffLogin("ops01", "wrong-password");
    expect(bad.ok).toBe(false);
    const r = verifyStaffLogin("boss", "Boss@123456");
    if (r.ok) {
      const { revokeStaffToken } = await import("./admin");
      revokeStaffToken(r.token);
      expect(staffFromToken(r.token)).toBeNull();
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
    const r = verifyStaffLogin("teacher01", "Teach@123456");
    if (!r.ok) throw new Error("login failed");
    setQuestionStatus("fa-3", "已下线", r.staff);
    expect(getQuestionStatus("fa-3")).toBe("已下线");
    expect(disabledQuestionIds()).toContain("fa-3");
    // 恢复，避免影响其他数据
    setQuestionStatus("fa-3", "已发布", r.staff);
    expect(disabledQuestionIds()).not.toContain("fa-3");

    const log = listAudit(20);
    expect(log.some((a) => a.action.includes("fa-3") && a.actor === "教研阿岸")).toBe(true);
  });

  it("匿名越权也进审计", () => {
    audit(null, "越权尝试：测试注入");
    expect(listAudit(5).some((a) => a.action.includes("越权尝试") && a.role === "anonymous")).toBe(true);
  });
});

describe("共享数据（考试/套餐/工单）", () => {
  it("考试与套餐读写共享于服务端库", () => {
    const r = verifyStaffLogin("ops01", "Ops@123456");
    if (!r.ok) throw new Error("login failed");
    addExam({ name: "2027年省考", region: "广东", date: "2027-03", subjects: "行测+申论" }, r.staff);
    expect(listExams().some((e) => e.name === "2027年省考")).toBe(true);
  });

  it("工单创建与处理", () => {
    createTicket({ category: "其他", type: "问题", text: "测试工单内容足够长", hasScreenshot: false });
    const t = listTickets()[0]!;
    const r = verifyStaffLogin("support01", "Support@123456");
    if (!r.ok) throw new Error("login failed");
    setTicketStatus(t.id, "已处理", r.staff);
    expect(listTickets().find((x) => x.id === t.id)?.status).toBe("已处理");
  });
});
