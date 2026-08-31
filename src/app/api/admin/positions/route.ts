import { NextResponse } from "next/server";
import { authStaff, listPositions, upsertPositions } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/positions — 职位库（config:read） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listPositions() });
}

/** POST /api/admin/positions — 批量导入职位表（config:write，F0352/F0353/F0354） */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      const { audit } = await import("@/lib/server/admin");
      audit(null, "越权尝试：无配置写权限调用 POST /api/admin/positions");
      return NextResponse.json({ ok: false, message: "当前角色无配置写权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { rows?: Array<Record<string, unknown>> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ ok: false, message: "rows 不能为空" }, { status: 400 });
  }
  const r = upsertPositions(body.rows, authResult.staff);
  return NextResponse.json({
    ok: r.problems.length === 0,
    inserted: r.inserted,
    problems: r.problems,
    message:
      r.problems.length === 0
        ? `导入成功 ${r.inserted} 条（来源与更新时间已记录，F0354）。`
        : `成功 ${r.inserted} 条；${r.problems.length} 条校验失败：${r.problems.slice(0, 4).join("；")}`,
  });
}
