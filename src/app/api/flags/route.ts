import { NextResponse } from "next/server";
import { flagStates, flagSubject } from "@/lib/server/flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/flags — 服务端灰度判定（F0359）。
 * 主体取自 Bearer token；不接受客户端自带 userKey，也不回传灰度比例等配置细节。
 */
export async function GET(req: Request): Promise<NextResponse> {
  const subject = flagSubject(req);
  return NextResponse.json({ ok: true, authenticated: subject.authenticated, flags: flagStates(subject) });
}
