import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "jianan-entitle-"));
process.env.JIANAN_DB_PATH = join(dir, "test.db");
process.env.JIANAN_BOOTSTRAP_STAFF_JSON = JSON.stringify([
  { username: "unit-support", password: "UnitSupport#2026pass", role: "support", displayName: "单测客服" },
]);

const { closeDb, createUser } = await import("./db");
const { verifyStaffLogin, addCompensation, userEntitlements, listCompensations } = await import("./admin");

afterAll(() => { closeDb(); rmSync(dir, { recursive: true, force: true }); });

describe("人工补偿真实生效（F0339）", () => {
  it("时长与额度补偿累计到用户权益，并保留可核对台账", () => {
    const login = verifyStaffLogin("unit-support", "UnitSupport#2026pass");
    if (!login.ok) throw new Error("login failed");
    const user = createUser("13900000501");

    expect(userEntitlements(user.id)).toEqual({ bonusDays: 0, bonusQuota: 0 });

    addCompensation(user.id, "时长", 7, "系统故障补偿", login.staff);
    addCompensation(user.id, "额度", 5, "批改失败补偿", login.staff);
    addCompensation(user.id, "时长", 3, "二次故障补偿", login.staff);

    expect(userEntitlements(user.id)).toEqual({ bonusDays: 10, bonusQuota: 5 });
    const records = listCompensations(user.id);
    expect(records).toHaveLength(3);
    expect(records.every((item) => item.reason.length > 0)).toBe(true);
  });

  it("未获补偿的用户读到零值，不串号", () => {
    const other = createUser("13900000502");
    expect(userEntitlements(other.id)).toEqual({ bonusDays: 0, bonusQuota: 0 });
  });
});
