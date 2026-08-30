import { NextResponse } from "next/server";
import { revokeStaffToken } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/auth/logout — 员工退出 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) revokeStaffToken(token);
  return NextResponse.json({ ok: true });
}
