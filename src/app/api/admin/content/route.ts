import { NextResponse } from "next/server";
import { authStaff } from "@/lib/server/admin";
import {
  getEssayBundle,
  getPublishedEssayBundle,
  listEssayQuestionIds,
  listEssayRevisions,
  publishEssayRevision,
  saveEssayDraft,
} from "@/lib/server/essay-content";
import { diffBundles } from "@/lib/essay/content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 申论内容配置（F0344–F0347）：题干/任务/字数/材料/Rubric/得分点/范例作为一个内容包版本化管理。
 * GET  ?questionId=&revision=      读取指定版本（缺省读已发布版本）
 * GET  ?questionId=&left=&right=   版本前后对比（F0344）
 * POST { action: "saveDraft" | "publish" }
 */
export async function GET(req: Request): Promise<NextResponse> {
  const a = authStaff(req, "content:read");
  if (!a.staff) return NextResponse.json({ ok: false, message: "无权限" }, { status: a.forbidden ? 403 : 401 });

  const url = new URL(req.url);
  const questions = listEssayQuestionIds();
  const questionId = url.searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ ok: true, questions });

  const revisions = listEssayRevisions(questionId);
  const left = Number(url.searchParams.get("left"));
  const right = Number(url.searchParams.get("right"));
  if (Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0) {
    const before = getEssayBundle(questionId, left);
    const after = getEssayBundle(questionId, right);
    if (!before || !after) return NextResponse.json({ ok: false, message: "对比版本不存在" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      questions,
      revisions,
      diff: diffBundles(before.bundle, after.bundle),
      left: before.meta,
      right: after.meta,
    });
  }

  const revisionParam = Number(url.searchParams.get("revision"));
  const selected = Number.isFinite(revisionParam) && revisionParam > 0
    ? getEssayBundle(questionId, revisionParam)
    : getPublishedEssayBundle(questionId);
  return NextResponse.json({
    ok: true,
    questions,
    revisions,
    bundle: selected?.bundle ?? null,
    meta: selected?.meta ?? null,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const a = authStaff(req, "content:write");
  if (!a.staff) return NextResponse.json({ ok: false, message: "当前角色无内容写权限" }, { status: a.forbidden ? 403 : 401 });
  let body: { action?: string; questionId?: string; bundle?: unknown; changeReason?: string; ticketRef?: string; revision?: number };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  const questionId = (body.questionId ?? "").trim();
  if (questionId === "") return NextResponse.json({ ok: false, message: "缺少 questionId" }, { status: 400 });

  if (body.action === "saveDraft") {
    const result = saveEssayDraft(
      { questionId, bundle: body.bundle, changeReason: body.changeReason ?? "", ticketRef: body.ticketRef ?? null },
      a.staff,
    );
    return result.ok
      ? NextResponse.json({ ok: true, revision: result.revision })
      : NextResponse.json({ ok: false, message: "内容包校验未通过", issues: result.issues }, { status: 400 });
  }

  if (body.action === "publish") {
    const revision = Number(body.revision);
    if (!Number.isFinite(revision) || revision <= 0) {
      return NextResponse.json({ ok: false, message: "缺少待发布版本号" }, { status: 400 });
    }
    const result = publishEssayRevision({ questionId, revision }, a.staff);
    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false, message: "发布失败", issues: result.issues }, { status: 400 });
  }

  return NextResponse.json({ ok: false, message: "未知操作" }, { status: 400 });
}
