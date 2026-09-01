import { NextResponse } from "next/server";
import { authStaff, getAiConfig, setAiConfig, audit } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 运营配置与灰度（F0356/F0357/F0359）以及申论 Rubric 人工校准（F0377）。
 * 单一配置 API 仍按服务端能力校验并写审计。
 */
const KEYS = ["notices", "message_templates", "feature_flags", "rubric_calibrations"] as const;

export async function GET(req: Request): Promise<NextResponse> {
  const a = authStaff(req, "config:read");
  if (!a.staff) return NextResponse.json({ ok: false, message: "无权限" }, { status: a.forbidden ? 403 : 401 });
  return NextResponse.json({
    ok: true,
    notices: getAiConfig("notices") ?? [{ id: "n1", title: "本周复盘已上线", body: "看看哪些投入真正有效。", status: "草稿" }],
    message_templates: getAiConfig("message_templates") ?? [{ id: "t1", kind: "学习", template: "你的{metric}最近有变化。" }],
    feature_flags: getAiConfig("feature_flags") ?? [],
    rubric_calibrations: getAiConfig("rubric_calibrations") ?? [],
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const a = authStaff(req, "config:write");
  if (!a.staff) {
    if (a.forbidden) audit(null, "越权尝试：无运营配置写权限调用 operations");
    return NextResponse.json({ ok: false, message: "当前角色无运营配置写权限" }, { status: a.forbidden ? 403 : 401 });
  }
  let body: { key?: string; value?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  if (!body.key || !KEYS.includes(body.key as (typeof KEYS)[number])) return NextResponse.json({ ok: false, message: "未知运营配置" }, { status: 400 });
  setAiConfig(body.key, body.value, a.staff);
  return NextResponse.json({ ok: true });
}
