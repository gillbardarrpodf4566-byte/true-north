import { NextResponse } from "next/server";
import { addCompensation, authStaff, audit, getUserAdminState, listCompensations, setUserAdminState } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/users — 用户概览（F0335/F0336，敏感原始内容默认不展示） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "users:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  const { getDb } = await import("@/lib/server/db");
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.id, u.phone, u.nickname, u.created_at,
              (SELECT COUNT(*) FROM auth_tokens t WHERE t.user_id = u.id AND t.expires_at > ?) AS active_tokens,
              (SELECT COUNT(*) FROM user_permissions p WHERE p.user_id = u.id) AS permission_records
       FROM users u ORDER BY u.id DESC LIMIT 200`,
    )
    .all(new Date().toISOString()) as Array<{
    id: number;
    phone: string;
    nickname: string | null;
    created_at: string;
    active_tokens: number;
    permission_records: number;
  }>;
  return NextResponse.json({
    ok: true,
    rows: users.map((u) => ({ ...u, admin: getUserAdminState(u.id), compensations: listCompensations(u.id) })),
  });
}

/** PATCH /api/admin/users — F0337 封禁/解封/风险标记 + F0339 客服补偿（均需权限+审计） */
export async function PATCH(req: Request): Promise<NextResponse> {
  const a = authStaff(req, "users:read");
  if (!a.staff) {
    if (a.forbidden) audit(null, "越权尝试：无用户运营权限调用 PATCH /api/admin/users");
    return NextResponse.json({ ok: false, message: a.forbidden ? "无权限" : "未登录" }, { status: a.forbidden ? 403 : 401 });
  }
  let body: { userId?: number; action?: string; status?: "正常" | "封禁" | "风险标记"; note?: string; kind?: "时长" | "额度"; amount?: number; reason?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  if (!body.userId || !body.action) return NextResponse.json({ ok: false, message: "userId/action 必填" }, { status: 400 });

  const canOps = a.staff.role === "operations" || a.staff.role === "admin";
  const canSupport = a.staff.role === "support" || canOps;
  if (body.action === "status") {
    if (!canOps || !body.status) return NextResponse.json({ ok: false, message: "当前角色无封禁/标记权限" }, { status: 403 });
    setUserAdminState(body.userId, body.status, body.note ?? "", a.staff);
  } else if (body.action === "compensate") {
    if (!canSupport || !body.kind || !body.reason) return NextResponse.json({ ok: false, message: "当前角色无补偿权限或参数不完整" }, { status: 403 });
    // 补偿只能是正整数且有上限：负数会反向扣减用户权益，非整数会污染 INTEGER 列。
    const amount = Number(body.amount);
    const cap = body.kind === "时长" ? 365 : 1000;
    if (!Number.isInteger(amount) || amount <= 0 || amount > cap) {
      return NextResponse.json({ ok: false, message: `补偿数量必须是 1–${cap} 的整数` }, { status: 400 });
    }
    addCompensation(body.userId, body.kind, amount, body.reason, a.staff);
  } else return NextResponse.json({ ok: false, message: "未知操作" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
