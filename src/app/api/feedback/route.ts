import { NextResponse } from "next/server";
import { createTicket } from "@/lib/server/admin";
import { userFromToken } from "@/lib/server/db";
import { createAiFeedbackCandidate } from "@/lib/server/ai-feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/feedback — 反馈先进入客服工单。
 * 仅明确指向 AI/rule 输出的反馈才投射为已脱敏质量候选；泛反馈不会混入评测池。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { type?: string; text?: string; hasScreenshot?: boolean; target?: string; invocationId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (text.length < 5 || text.length > 2000) return NextResponse.json({ ok: false, message: "请填写 5–2000 字的描述" }, { status: 400 });

  const type = body.type === "建议" ? "建议" : body.type === "内容纠错" ? "内容纠错" : "问题";
  const target = body.target?.trim() ?? "";
  const category = target.startsWith("diagnosis")
    ? "诊断不准"
    : target.startsWith("essay")
      ? "批改偏差"
      : target.startsWith("session") || target.startsWith("parse")
        ? "解析错误"
        : target.startsWith("support")
          ? "人工支持"
          : "其他";
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  // F0320：内容纠错必须指向真实题目，否则工单无法定位
  if (target.startsWith("session:")) {
    const questionId = target.slice("session:".length).trim();
    const { questionById } = await import("@/lib/questions/seed");
    if (!questionById(questionId)) {
      return NextResponse.json({ ok: false, message: "题目编号不存在，请在题目页复制正确编号。" }, { status: 400 });
    }
  }
  const ticketId = createTicket({ category, type, text, hasScreenshot: body.hasScreenshot === true, targetRef: target || null });

  // F0322：人工支持工单不进 AI 质量候选池，但需要把工单号回给用户以便追踪。
  const aiRelated = ["解析错误", "诊断不准", "批改偏差", "幻觉"].includes(category);
  const candidate = aiRelated
    ? createAiFeedbackCandidate({ ticketId, category, rawText: text, invocationId: body.invocationId, userId: user?.id ?? null })
    : null;
  return NextResponse.json({
    ok: true,
    queued: true,
    ticketId,
    candidate: candidate ? {
      id: candidate.id,
      provenanceStatus: candidate.provenanceStatus,
      reviewStatus: candidate.reviewStatus,
    } : null,
  });
}
