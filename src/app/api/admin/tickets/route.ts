import { NextResponse } from "next/server";
import { authStaff, audit, listTickets, setTicketStatus } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/tickets — 反馈工单（tickets:read） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "tickets:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listTickets() });
}

/** PATCH /api/admin/tickets — 处理工单（tickets:write，operations/support/admin） */
export async function PATCH(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "tickets:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      audit(null, "越权尝试：无工单写权限的角色调用 PATCH /api/admin/tickets");
      return NextResponse.json({ ok: false, message: "当前角色无工单写权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { id?: number; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  setTicketStatus(body.id, body.status, authResult.staff);
  return NextResponse.json({ ok: true });
}
