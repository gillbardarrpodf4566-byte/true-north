import { NextResponse } from "next/server";
import { listExamNodes, addExamNode } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/exam-nodes — 考试节点（F0351，公开只读给报名提醒 F0274/F0291） */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, rows: listExamNodes() });
}

/** POST /api/admin/exam-nodes — 新增节点（config:write） */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = await import("@/lib/server/admin").then((m) => m.authStaff(req, "config:write"));
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  let body: { examName?: string; kind?: string; date?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  if (!body.examName?.trim() || !body.kind?.trim() || !body.date?.trim()) {
    return NextResponse.json({ ok: false, message: "examName/kind/date 必填" }, { status: 400 });
  }
  addExamNode(body.examName.trim(), body.kind.trim(), body.date.trim(), authResult.staff);
  return NextResponse.json({ ok: true });
}
