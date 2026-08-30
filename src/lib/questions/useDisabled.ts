"use client";

/**
 * 已下线题目过滤（F0343/F0148 组卷生效）：从服务端拉取一次并缓存；
 * 失败时按「无下线」降级，不阻塞训练。
 */
let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

export async function fetchDisabledQuestions(): Promise<string[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/api/questions/disabled")
      .then((r) => r.json())
      .then((d: { ok: boolean; ids?: string[] }) => {
        cache = d.ok ? (d.ids ?? []) : [];
        return cache;
      })
      .catch(() => []);
  }
  return inflight;
}

export function filterDisabled<T extends { id: string }>(list: T[], disabled: string[]): T[] {
  if (disabled.length === 0) return list;
  return list.filter((q) => !disabled.includes(q.id));
}
