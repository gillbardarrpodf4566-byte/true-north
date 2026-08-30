import { NextResponse } from "next/server";
import { authStaff, listAudit } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/audit — 审计日志（audit:read，只读，F0365） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "audit:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listAudit(150) });
}
