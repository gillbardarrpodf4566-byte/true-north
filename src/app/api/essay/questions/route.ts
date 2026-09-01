import { NextResponse } from "next/server";
import { listEssayQuestionIds, getPublishedEssayBundle } from "@/lib/server/essay-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/essay/questions — 面向考生的已发布申论题（F0345/F0347）。
 * 作答前不得下发采分点与 Rubric 权重（那是评分答案），只保留题干、材料、字数与范例。
 * 评分依据只在服务端 /api/essay/grade 内使用。
 */
export async function GET(): Promise<NextResponse> {
  const questions = listEssayQuestionIds().flatMap((questionId) => {
    const published = getPublishedEssayBundle(questionId);
    if (!published) return [];
    const { id, type, title, year, region, exam, task, materials, wordLimit } = published.bundle.question;
    return [{
      question: { id, type, title, year, region, exam, task, materials, wordLimit },
      revision: published.meta.revision,
      examples: published.bundle.examples,
    }];
  });
  return NextResponse.json({ ok: true, questions });
}
