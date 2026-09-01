import { NextResponse } from "next/server";
import { deleteUserData, userFromToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/delete — 账号注销（F0334）：服务端真实删除用户关联数据。 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  if (!user) return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
  let body: { confirm?: string };
  try { body = (await req.json()) as typeof body; } catch { body = {}; }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ ok: false, message: "请传入 confirm=DELETE 进行二次确认" }, { status: 400 });
  }
  deleteUserData(user.id);
  return NextResponse.json({ ok: true, deleted: true });
}
