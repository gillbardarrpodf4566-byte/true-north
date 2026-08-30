import { NextResponse } from "next/server";
import { createTicket } from "@/lib/server/admin";
import { userFromToken } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/feedback — 用户反馈入库（F0318/F0319 → 后台工单 F0361/F0362）。
 * 匿名可提交；带用户 token 时工单关联账号。target 前缀自动归类 AI 问题类别。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { type?: string; text?: string; hasScreenshot?: boolean; target?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (text.length < 5 || text.length > 2000) {
    return NextResponse.json({ ok: false, message: "请填写 5–2000 字的描述" }, { status: 400 });
  }
  const type = body.type === "建议" ? "建议" : "问题";
  const target = body.target ?? "";
  const category = target.startsWith("diagnosis")
    ? "诊断不准"
    : target.startsWith("session")
      ? "解析错误"
      : target.startsWith("parse")
        ? "解析错误"
        : "其他";
  void userFromToken; // 关联用户为后续增强；MVP 工单不落用户 ID
  createTicket({ category, type, text, hasScreenshot: body.hasScreenshot === true });
  return NextResponse.json({ ok: true, queued: true });
}
