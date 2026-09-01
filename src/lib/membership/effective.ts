import type { Membership } from "@/lib/profile/store";

export interface CompensationBonus {
  bonusDays: number;
  bonusQuota: number;
}

export const NO_BONUS: CompensationBonus = { bonusDays: 0, bonusQuota: 0 };

/**
 * F0339 有效权益：客服补偿必须真正参与额度与到期判断，
 * 否则界面声称「已到账」而可用额度不变，属于虚假陈述。
 * 所有消费额度或判断到期的地方都应通过本函数取值。
 */
export function effectiveMembership(membership: Membership, bonus: CompensationBonus = NO_BONUS): {
  aiQuota: number;
  aiRemaining: number;
  expiresAt: string | null;
  unlimited: boolean;
} {
  const unlimited = membership.plan !== "free";
  const aiQuota = membership.aiQuota + Math.max(0, bonus.bonusQuota);
  const expiresAt = membership.expiresAt && bonus.bonusDays > 0
    ? new Date(new Date(membership.expiresAt).getTime() + bonus.bonusDays * 86_400_000).toISOString()
    : membership.expiresAt;
  return {
    aiQuota,
    aiRemaining: Math.max(0, aiQuota - membership.usedAi),
    expiresAt,
    unlimited,
  };
}

/** 是否还能发起一次 AI 调用（免费档按有效额度判断，付费档不限）。 */
export function canUseAi(membership: Membership, bonus: CompensationBonus = NO_BONUS): boolean {
  const effective = effectiveMembership(membership, bonus);
  return effective.unlimited || effective.aiRemaining > 0;
}
