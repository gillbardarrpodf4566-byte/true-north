import { NextResponse } from "next/server";
import {
  authStaff,
  audit,
  getQuestionStatus,
  listCustomQuestions,
  saveCustomQuestion,
  setQuestionStatus,
  type QuestionStatus,
} from "@/lib/server/admin";
import { allSeedQuestions } from "@/lib/questions/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/questions — 题库列表（种子 + 自建 + 服务端状态合并） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "bank:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "当前角色无题库读权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  const rows = [
    ...allSeedQuestions().map((q) => ({
      id: q.id,
      moduleId: q.moduleId,
      stem: q.stem.split("\n")[0] ?? "",
      knowledgePoint: q.knowledgePoint,
      realExam: q.realExam,
      status: getQuestionStatus(q.id) ?? "已发布",
    })),
    ...listCustomQuestions().map((c) => ({
      id: c.qid,
      moduleId: String(c.payload.moduleId ?? "自定义"),
      stem: String(c.payload.stem ?? "").slice(0, 60),
      knowledgePoint: String(c.payload.knowledgePoint ?? ""),
      realExam: null as null,
      status: getQuestionStatus(c.qid) ?? "草稿",
    })),
  ];
  return NextResponse.json({ ok: true, rows });
}

const STATUSES: QuestionStatus[] = ["草稿", "审核", "已发布", "已下线"];

/** POST /api/admin/questions — {action:"status"} 改状态；{action:"import"} 批量导入 */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "bank:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      audit(null, "越权尝试：无题库写权限的角色调用了 POST /api/admin/questions");
      return NextResponse.json(
        { ok: false, message: "当前角色无题库写权限（F0364）" },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  const staff = authResult.staff;

  let body: { action?: string; qid?: string; status?: string; rows?: Array<Record<string, unknown>> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  if (body.action === "status" && body.qid && body.status && STATUSES.includes(body.status as QuestionStatus)) {
    setQuestionStatus(body.qid, body.status as QuestionStatus, staff);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "import" && Array.isArray(body.rows)) {
    const problems: string[] = [];
    body.rows.forEach((row, i) => {
      for (const key of ["moduleId", "stem", "options", "answerIndex", "explanation"]) {
        if (row[key] == null) problems.push(`第 ${i + 1} 条缺少 ${key}`);
      }
      if (Array.isArray(row.options) && row.options.length !== 4) {
        problems.push(`第 ${i + 1} 条选项数不是 4`);
      }
    });
    if (problems.length > 0) {
      return NextResponse.json({ ok: false, problems });
    }
    for (const [i, row] of body.rows.entries()) {
      saveCustomQuestion(`custom-${Date.now()}-${i}`, row, staff);
    }
    return NextResponse.json({
      ok: true,
      message: `校验通过 ${body.rows.length} 条，已进入「草稿」待审核。`,
    });
  }

  return NextResponse.json({ ok: false, message: "未知操作" }, { status: 400 });
}
