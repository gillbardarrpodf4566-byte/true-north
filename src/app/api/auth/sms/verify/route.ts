import { NextResponse } from "next/server";
import { verifySmsCode } from "@/lib/server/sms";
import { createUser, findUserByPhone, issueToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/sms/verify — 校验验证码并登录（F0003/F0014）。
 * 新手机号自动建档；失败返回结构化原因与恢复路径。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { phone?: string; code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, reason: "wrong", canResendIn: 60, message: "手机号或验证码格式不正确。" },
      { status: 400 },
    );
  }

  const result = verifySmsCode(phone, "login", code);
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }

  const existing = findUserByPhone(phone);
  const user = existing ?? createUser(phone);
  const { token } = issueToken(user.id);
  return NextResponse.json({
    ok: true,
    token,
    isNew: !existing,
    user: { id: user.id, phone: user.phone, nickname: user.nickname },
  });
}
