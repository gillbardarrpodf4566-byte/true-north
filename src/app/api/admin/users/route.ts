import { NextResponse } from "next/server";
import { authStaff, listExams, listPlans } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/users — 用户概览（users:read；只展示账号层与授权计数，敏感原始内容默认不展示 F0336） */
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
    rows: users,
    membershipPlanCount: listPlans().length,
    examCount: listExams().length,
  });
}
