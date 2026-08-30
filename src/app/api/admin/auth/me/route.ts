import { NextResponse } from "next/server";
import { staffFromToken } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/auth/me — 员工身份 */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const staff = staffFromToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!staff) {
    return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, staff });
}
