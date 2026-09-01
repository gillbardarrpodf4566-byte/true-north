"use client";

/**
 * 已发布申论内容的客户端读取（F0345/F0347）：
 * 服务端发布版本是唯一事实源，静态种子仅作离线兜底。
 */
import { useEffect, useState } from "react";
import { ESSAY_SEED } from "@/lib/essay/bank";
import type { EssayQuestion } from "@/lib/essay/types";
import type { EssayContentExample } from "@/lib/essay/content";

/** 作答期可见字段：不包含 rubric 与 scorePoints（评分答案只在服务端使用）。 */
export type PublicEssayQuestion = Omit<EssayQuestion, "rubric" | "scorePoints">;

export interface PublishedEssay {
  question: PublicEssayQuestion;
  revision: number;
  examples: EssayContentExample[];
}

const FALLBACK: PublishedEssay[] = ESSAY_SEED.map(({ rubric, scorePoints, ...question }) => {
  void rubric;
  void scorePoints;
  return { question, revision: 0, examples: [] };
});

export function usePublishedEssays(): { essays: PublishedEssay[]; loading: boolean; offline: boolean } {
  const [essays, setEssays] = useState<PublishedEssay[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    void fetch("/api/essay/questions")
      .then((r) => r.json())
      .then((d: { ok: boolean; questions?: PublishedEssay[] }) => {
        if (d.ok && d.questions && d.questions.length > 0) {
          setEssays(d.questions);
          setOffline(false);
        } else {
          setOffline(true);
        }
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  return { essays, loading, offline };
}
