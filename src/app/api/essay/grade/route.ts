import { NextResponse } from "next/server";
import { gradeEssay } from "@/lib/essay/grade";
import { getPublishedEssayBundle } from "@/lib/server/essay-content";
import { requireFeature } from "@/lib/server/flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/essay/grade — 申论批改服务端入口。
 * 评分始终使用「已发布内容包」（F0345/F0346）：材料、Rubric、得分点同版本，
 * 并把使用的版本号回传，历史批改可追溯到当时依据。
 */
export async function POST(req: Request): Promise<NextResponse> {
  const gate = requireFeature(req, "essay_coach");
  if (!gate.ok) return NextResponse.json({ ok: false, message: gate.message }, { status: gate.status });

  let body: { questionId?: string; text?: string; submissionId?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  const published = getPublishedEssayBundle(body.questionId ?? "");
  if (!published || text.length < 1) {
    return NextResponse.json({ ok: false, message: "题目或答案不能为空" }, { status: 400 });
  }

  const grade = {
    ...gradeEssay({ id: body.submissionId ?? `api-${Date.now()}`, text }, published.bundle.question),
    contentRevision: published.meta.revision,
  };
  return NextResponse.json({
    ok: true,
    grade,
    contentRevision: published.meta.revision,
    rubricSource: `已发布内容包 r${published.meta.revision}`,
  });
}
