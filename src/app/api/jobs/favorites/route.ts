import { NextResponse } from "next/server";
import { listJobFavorites, removeJobFavorite, saveJobFavorite, userFromToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET/POST/DELETE /api/jobs/favorites（F0273）。
 * 服务端收藏仅属于已认证账号；访客收藏只留在本地 profile namespace，
 * 不再使用可伪造/共享的 anon key。
 */
export async function GET(req: Request): Promise<NextResponse> {
  const user = currentUser(req);
  return NextResponse.json({ ok: true, ids: user ? listJobFavorites(`user:${user.id}`) : [] });
}
export async function POST(req: Request): Promise<NextResponse> {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ ok: false, message: "登录后可跨设备同步收藏；访客收藏仅保存在当前设备" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { qid?: string };
  if (!body.qid) return NextResponse.json({ ok: false, message: "qid 必填" }, { status: 400 });
  saveJobFavorite(`user:${user.id}`, body.qid);
  return NextResponse.json({ ok: true, ids: listJobFavorites(`user:${user.id}`) });
}
export async function DELETE(req: Request): Promise<NextResponse> {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { qid?: string };
  if (!body.qid) return NextResponse.json({ ok: false, message: "qid 必填" }, { status: 400 });
  removeJobFavorite(`user:${user.id}`, body.qid);
  return NextResponse.json({ ok: true, ids: listJobFavorites(`user:${user.id}`) });
}

function currentUser(req: Request) {
  const auth = req.headers.get("authorization");
  return userFromToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
}
