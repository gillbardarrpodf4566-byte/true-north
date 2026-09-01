import { NextResponse } from "next/server";
import { authStaff, getAiConfig, setAiConfig } from "@/lib/server/admin";
import { ESSAY_SEED } from "@/lib/essay/bank";
import { gradeEssay } from "@/lib/essay/grade";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Calibration {
  id: string;
  questionId: string;
  excerpt: string;
  autoScore: number;
  humanScore: number;
  note: string;
  reviewedBy: string;
  reviewedAt: string;
}

/** 抽样答案：来自评测集用例，确定性选取，便于复核可复现。 */
const SAMPLES: Array<{ questionId: string; text: string }> = [
  { questionId: "essay-gaikuang-1", text: "S市依托一网统管平台统一接入数据实现自动分派限时办结；推行随手拍小程序发动居民上报；实行免申即享让政策找人；上线一表通精简报表；为独居老人安装水表智感设备自动预警。" },
  { questionId: "essay-gaikuang-1", text: "搞了智慧治理，老百姓觉得方便。" },
  { questionId: "essay-duice-1", text: "建议一是统一选品和质量标准加强监管；二是建设冷链物流降低损耗；三是培训主播并建立留才机制。" },
];

/**
 * GET /api/admin/aiops/calibration — F0377 抽样人工复核。
 * 返回可复核样本（含自动分）与已记录的人工校准，用于计算自动 vs 人工偏差。
 */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "aiops:read");
  if (!auth.staff) return NextResponse.json({ ok: false, message: auth.forbidden ? "无权限" : "未登录" }, { status: auth.forbidden ? 403 : 401 });
  const calibrations = (getAiConfig("rubric_calibrations") as Calibration[] | null) ?? [];
  const samples = SAMPLES.map((sample, index) => {
    const question = ESSAY_SEED.find((item) => item.id === sample.questionId)!;
    const grade = gradeEssay({ id: `calib-${index}`, text: sample.text }, question);
    return {
      id: `sample-${index}`,
      questionId: sample.questionId,
      questionTitle: question.title,
      excerpt: sample.text.slice(0, 60),
      autoScore: grade.score,
      fullScore: question.rubric.fullScore,
    };
  });
  const scored = calibrations.filter((item) => Number.isFinite(item.humanScore));
  const meanGap = scored.length > 0
    ? Math.round((scored.reduce((sum, item) => sum + Math.abs(item.autoScore - item.humanScore), 0) / scored.length) * 10) / 10
    : null;
  return NextResponse.json({ ok: true, samples, calibrations, meanGap, reviewed: scored.length });
}

/** POST — 记录一条人工复核分与说明；同一样本以最新一次为准。 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "aiops:write");
  if (!auth.staff) return NextResponse.json({ ok: false, message: auth.forbidden ? "无 AI 运营写权限" : "未登录" }, { status: auth.forbidden ? 403 : 401 });
  let body: { sampleId?: string; questionId?: string; excerpt?: string; autoScore?: number; humanScore?: number; note?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  const humanScore = Number(body.humanScore);
  if (!body.sampleId || !body.questionId || !Number.isFinite(humanScore) || humanScore < 0) {
    return NextResponse.json({ ok: false, message: "缺少样本标识或人工分不合法" }, { status: 400 });
  }
  const existing = (getAiConfig("rubric_calibrations") as Calibration[] | null) ?? [];
  const next: Calibration[] = [
    ...existing.filter((item) => item.id !== body.sampleId),
    {
      id: body.sampleId,
      questionId: body.questionId,
      excerpt: String(body.excerpt ?? "").slice(0, 60),
      autoScore: Number(body.autoScore) || 0,
      humanScore,
      note: String(body.note ?? "").slice(0, 200),
      reviewedBy: auth.staff.display_name,
      reviewedAt: new Date().toISOString(),
    },
  ];
  setAiConfig("rubric_calibrations", next, auth.staff);
  return NextResponse.json({ ok: true, reviewed: next.length });
}
