import { NextResponse } from "next/server";
import { verifyStaffLogin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/auth/login — 员工登录；账号由带外引导配置发放，失败次数过多返回 429。 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const result = verifyStaffLogin((body.username ?? "").trim(), body.password ?? "");
  if (!result.ok) {
    if (result.retryAfterSeconds != null) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ ok: false, message: result.message }, { status: 401 });
  }
  return NextResponse.json(result);
}
