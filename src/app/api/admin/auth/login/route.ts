import { NextResponse } from "next/server";
import { verifyStaffLogin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/auth/login — 员工登录（种子账号见 GAP-10） */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const result = verifyStaffLogin((body.username ?? "").trim(), body.password ?? "");
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
