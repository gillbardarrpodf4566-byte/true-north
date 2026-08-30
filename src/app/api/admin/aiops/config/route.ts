import { NextResponse } from "next/server";
import {
  authStaff,
  getAiConfig,
  listEvalRuns,
  setAiConfig,
} from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/aiops/config — AI 配置与评测历史（aiops:read） */
export async function GET(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "aiops:read");
  if (!authResult.staff) {
    return NextResponse.json(
      { ok: false, message: authResult.forbidden ? "无权限" : "未登录" },
      { status: authResult.forbidden ? 403 : 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    routing: getAiConfig("routing"),
    dailyBudget: getAiConfig("daily_budget"),
    promptVersions: getAiConfig("prompt_versions"),
    schemaVersions: getAiConfig("schema_versions"),
    evalRuns: listEvalRuns(),
  });
}

/** POST /api/admin/aiops/config — 更新路由/预算/Prompt 版本（aiops:write，F0366–F0371） */
export async function POST(req: Request): Promise<NextResponse> {
  const authResult = authStaff(req, "aiops:write");
  if (!authResult.staff) {
    if (authResult.forbidden) {
      const { audit } = await import("@/lib/server/admin");
      audit(null, "越权尝试：非 AI 运营角色调用 POST /api/admin/aiops/config");
      return NextResponse.json({ ok: false, message: "当前角色无 AI 运营权限（F0364）" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }
  let body: { key?: string; value?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const allowed = ["routing", "daily_budget", "prompt_versions", "schema_versions"];
  if (!body.key || !allowed.includes(body.key)) {
    return NextResponse.json({ ok: false, message: "未知配置项" }, { status: 400 });
  }
  setAiConfig(body.key, body.value, authResult.staff);
  return NextResponse.json({ ok: true });
}
