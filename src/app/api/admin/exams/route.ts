import { NextResponse } from "next/server";
import { addExam, authStaff, audit, listExams } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/exams — 考试批次（config:read） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listExams() });
}

/** POST /api/admin/exams — 新增批次（config:write，operations/admin） */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "config:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      audit(null, "越权尝试：无配置写权限的角色调用 POST /api/admin/exams");
      return NextResponse.json({ ok: false, message: "当前角色无配置写权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { name?: string; region?: string; date?: string; subjects?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ ok: false, message: "考试名称必填" }, { status: 400 });
  }
  addExam(
    {
      name: body.name.trim(),
      region: body.region?.trim() || "待定",
      date: body.date?.trim() || "待定",
      subjects: body.subjects?.trim() || "行测+申论",
    },
    authResult.staff,
  );
  return NextResponse.json({ ok: true });
}
