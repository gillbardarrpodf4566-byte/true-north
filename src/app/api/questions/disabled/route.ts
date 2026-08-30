import { NextResponse } from "next/server";
import { disabledQuestionIds } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/questions/disabled — 已下线题目 ID（公开只读；组卷过滤用，F0343/F0148） */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, ids: disabledQuestionIds() });
}
