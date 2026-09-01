import { NextResponse } from "next/server";
import { userFromToken } from "@/lib/server/db";
import { recordAiInvocation, type ProducerKind } from "@/lib/server/ai-feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 记录真实的输出生产者上下文，供后续反馈引用。
 * 不接受客户端填写 model/prompt 版本：浏览器端规则流仅能登记为 rule_engine，
 * 服务端模型接入时由相应服务端适配器直接调用 recordAiInvocation。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { producerKind?: ProducerKind; feature?: string; schemaVersion?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  if (body.producerKind !== "rule_engine" || typeof body.feature !== "string" || body.feature.trim() === "") {
    return NextResponse.json({ ok: false, message: "浏览器端只能登记明确的规则引擎输出。" }, { status: 400 });
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  const invocation = recordAiInvocation({
    userId: user?.id ?? null,
    producerKind: "rule_engine",
    feature: body.feature.trim(),
    modelVersion: null,
    promptVersion: null,
    schemaVersion: typeof body.schemaVersion === "string" ? body.schemaVersion : null,
  });
  return NextResponse.json({ ok: true, invocationId: invocation.id });
}
