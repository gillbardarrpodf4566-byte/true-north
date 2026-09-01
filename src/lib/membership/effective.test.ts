import { describe, expect, it } from "vitest";
import { canUseAi, effectiveMembership } from "./effective";
import type { Membership } from "@/lib/profile/store";

const free = (patch: Partial<Membership> = {}): Membership => ({
  plan: "free",
  diagnosisQuota: 3,
  usedDiagnosis: 0,
  aiQuota: 20,
  usedAi: 20,
  expiresAt: null,
  orders: [],
  refunds: [],
  ...patch,
});

describe("补偿真实参与额度与到期（F0339）", () => {
  it("额度补偿提高可用额度，用尽后补偿让用户重新可用", () => {
    expect(effectiveMembership(free()).aiRemaining).toBe(0);
    expect(canUseAi(free())).toBe(false);

    const withBonus = effectiveMembership(free(), { bonusDays: 0, bonusQuota: 5 });
    expect(withBonus.aiQuota).toBe(25);
    expect(withBonus.aiRemaining).toBe(5);
    expect(canUseAi(free(), { bonusDays: 0, bonusQuota: 5 })).toBe(true);
  });

  it("时长补偿延后到期日；没有到期日时不凭空造一个", () => {
    const paid = free({ plan: "pro-monthly", expiresAt: "2026-09-01T00:00:00.000Z" });
    const extended = effectiveMembership(paid, { bonusDays: 7, bonusQuota: 0 });
    expect(extended.expiresAt?.slice(0, 10)).toBe("2026-09-08");
    expect(effectiveMembership(free(), { bonusDays: 7, bonusQuota: 0 }).expiresAt).toBeNull();
  });

  it("付费档不受额度限制，且补偿不会把额度算成负数", () => {
    const paid = effectiveMembership(free({ plan: "pro-yearly" }), { bonusDays: 0, bonusQuota: 0 });
    expect(paid.unlimited).toBe(true);
    expect(canUseAi(free({ plan: "pro-yearly" }))).toBe(true);
    // 负数补偿不应扩大或缩小额度（服务端已拦截，这里是纵深防御）
    expect(effectiveMembership(free({ usedAi: 0 }), { bonusDays: 0, bonusQuota: -5 }).aiQuota).toBe(20);
  });
});
