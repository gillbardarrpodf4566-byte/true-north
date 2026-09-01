import { NextResponse } from "next/server";
import { userFromToken } from "@/lib/server/db";
import { listCompensations, userEntitlements } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/membership/entitlements — F0339 用户侧读取客服发放的补偿。
 * 未登录返回零值，不暴露任何他人数据。
 */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  if (!user) return NextResponse.json({ ok: true, bonusDays: 0, bonusQuota: 0, records: [] });
  const entitlements = userEntitlements(user.id);
  const records = listCompensations(user.id).map((item) => ({
    kind: item.kind,
    amount: item.amount,
    reason: item.reason,
    at: item.created_at,
  }));
  return NextResponse.json({ ok: true, ...entitlements, records });
}
