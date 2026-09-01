import { NextResponse } from "next/server";
import { listJobFavorites, userFromToken } from "@/lib/server/db";
import { listPositionChangesFor } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/jobs/changes — F0275 收藏职位的变更提醒。
 * 登录用户读服务端收藏；访客可用 ?qids= 传本地收藏（只用于过滤，不写入任何数据）。
 */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  const url = new URL(req.url);
  const qids = user
    ? listJobFavorites(`user:${user.id}`)
    : (url.searchParams.get("qids") ?? "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 50);
  return NextResponse.json({ ok: true, changes: listPositionChangesFor(qids) });
}
