import { NextResponse } from "next/server";
import { authStaff } from "@/lib/server/admin";
import { listRules, publishRuleRevision, saveRuleDraft } from "@/lib/server/job-rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** F0353 qualification-rule draft/publish API. */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "config:read");
  if (!auth.staff) return NextResponse.json({ ok: false, message: "无权限" }, { status: auth.forbidden ? 403 : 401 });
  return NextResponse.json({ ok: true, rules: listRules() });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "config:write");
  if (!auth.staff) return NextResponse.json({ ok: false, message: "无配置写权限" }, { status: auth.forbidden ? 403 : 401 });
  let body: { action?: "saveDraft" | "publish"; rules?: unknown; changeReason?: string; revision?: number };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  if (body.action === "saveDraft") {
    const result = saveRuleDraft({ rules: body.rules, changeReason: body.changeReason ?? "" }, auth.staff);
    return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 400 });
  }
  if (body.action === "publish" && Number.isInteger(body.revision)) {
    const result = publishRuleRevision(body.revision!, auth.staff);
    return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({ ok: false, message: "未知操作或缺少版本号" }, { status: 400 });
}
