import { NextResponse } from "next/server";
import { authStaff, audit, listEvalRuns, recordEvalRun } from "@/lib/server/admin";
import { runDiagnosisEval, runParserEval } from "@/lib/server/eval";
import { runEssayEval } from "@/lib/ai/quality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/aiops/eval — 评测历史 */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "aiops:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({ ok: true, rows: listEvalRuns() });
}

/**
 * POST /api/admin/aiops/eval — 服务端真实执行评测（F0372/0373/0374/0375/0378/0379）。
 * parser 驱动 MockAiGateway（含对抗样本），诊断驱动 diagnose 引擎，
 * essay 跑 Rubric Grader 确定性断言；零容忍门禁不过则拦截。
 */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "aiops:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      audit(null, "越权尝试：非 AI 运营角色调用 POST /api/admin/aiops/eval");
      return NextResponse.json({ ok: false, message: "当前角色无 AI 运营权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { suite?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const outcome =
    body.suite === "diagnosis"
      ? runDiagnosisEval()
      : body.suite === "essay"
        ? runEssayEval()
        : await runParserEval();
  recordEvalRun(
    {
      suite: outcome.suite,
      passRate: outcome.passRate,
      failures: outcome.failures,
      gateVerdict: outcome.gateVerdict,
    },
    authResult.staff,
  );
  return NextResponse.json({
    ok: true,
    suite: outcome.suite,
    passRate: outcome.passRate,
    failures: outcome.failures,
    gateVerdict: outcome.gateVerdict,
    results: outcome.results,
  });
}
