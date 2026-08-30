import { NextResponse } from "next/server";
import { sendSmsCode } from "@/lib/server/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/sms/send — 发送验证码（F0003/F0013：冷却与小时限流） */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { phone?: string; purpose?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  const purpose = body.purpose === "login" ? "login" : null;
  if (!/^1\d{10}$/.test(phone) || !purpose) {
    return NextResponse.json(
      { ok: false, message: "请输入 11 位大陆手机号" },
      { status: 400 },
    );
  }
  const result = sendSmsCode(phone, purpose);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        retryAfter: result.retryAfter,
        message:
          result.reason === "cooldown"
            ? `发送太频繁，请 ${result.retryAfter} 秒后再试。`
            : `该号码今日发送已达上限，请 ${Math.ceil(result.retryAfter / 60)} 分钟后再试。`,
      },
      { status: 429 },
    );
  }
  return NextResponse.json({
    ok: true,
    retryAfter: result.retryAfter,
    // mock 短信通道：验证码直接返回；真实部署由服务商下发，删除此字段
    mock: result.mock,
  });
}
