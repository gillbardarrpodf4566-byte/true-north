import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/logout — 注销当前 token（F0333 服务端部分） */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) revokeToken(token);
  return NextResponse.json({ ok: true });
}
