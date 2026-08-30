import { NextResponse } from "next/server";
import { userFromToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/auth/me — Bearer token 换用户（F0001 启动页首屏加载用） */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, message: "未登录或登录已过期" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: { id: user.id, phone: user.phone, nickname: user.nickname },
  });
}
