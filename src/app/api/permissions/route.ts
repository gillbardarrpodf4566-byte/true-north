import { NextResponse } from "next/server";
import { latestPermission, recordPermission, userFromToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/permissions — 记录权限授权结果（F0008 通知 / F0009 相册）。
 * 流程符合 xlsx「说明→选择/授权→处理→结果确认→审计」：授权动作本身入库留痕。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { type?: string; granted?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const type = body.type === "notification" || body.type === "album" ? body.type : null;
  if (!type || typeof body.granted !== "boolean") {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  recordPermission(user?.id ?? null, type, body.granted);
  return NextResponse.json({ ok: true, stored: true });
}

/** GET /api/permissions?type=album — 查询最近一次授权状态 */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type");
  const type = typeParam === "notification" || typeParam === "album" ? typeParam : null;
  if (!type) {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  const latest = latestPermission(user?.id ?? null, type);
  return NextResponse.json({ ok: true, type, latest });
}
