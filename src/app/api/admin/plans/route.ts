import { NextResponse } from "next/server";
import { addPlan, authStaff, audit, listPlans } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/plans — 会员套餐（config:read） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listPlans() });
}

/** POST /api/admin/plans — 新增套餐（config:write） */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      audit(null, "越权尝试：无配置写权限的角色调用 POST /api/admin/plans");
      return NextResponse.json({ ok: false, message: "当前角色无配置写权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { name?: string; price?: number; benefits?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ ok: false, message: "套餐名称必填" }, { status: 400 });
  }
  addPlan(
    { name: body.name.trim(), price: Number(body.price) || 0, benefits: body.benefits?.trim() || "待定权益" },
    authResult.staff,
  );
  return NextResponse.json({ ok: true });
}
