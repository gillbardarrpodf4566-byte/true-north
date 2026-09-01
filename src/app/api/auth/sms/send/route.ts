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
    if (result.reason === "channel_unavailable") {
      // 没有真实短信服务商且未显式开启 mock 通道时失败关闭，绝不回显验证码。
      return NextResponse.json(
        { ok: false, reason: result.reason, message: "短信通道未配置，暂时无法发送验证码。请联系支持。" },
        { status: 503 },
      );
    }
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
    // 仅 mock 通道（本地/E2E）返回验证码；provider 通道由服务商下发。
    mock: result.mock,
  });
}
