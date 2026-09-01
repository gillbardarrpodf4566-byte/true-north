import { describe, expect, it } from "vitest";
import { errorCauseTrend } from "./v1";
import type { WrongBookEntry } from "@/lib/errorcause/engine";

const entry = (addedAt: string, cause: WrongBookEntry["confirmedCause"], id: string): WrongBookEntry => ({
  questionId: id,
  moduleId: "资料分析",
  addedAt,
  status: "待确认",
  suggested: null,
  confirmedCause: cause,
  retestLog: [],
});

describe("错因趋势按 ISO 周聚合（F0279）", () => {
  it("同一周内的不同日期合并为一个周桶", () => {
    const trend = errorCauseTrend([
      entry("2026-08-24T10:00:00.000Z", "计算错误", "a"),
      entry("2026-08-26T10:00:00.000Z", "计算错误", "b"),
      entry("2026-08-28T10:00:00.000Z", "计算错误", "c"),
    ]);
    expect(trend).toHaveLength(1);
    expect(trend[0]!.count).toBe(3);
    expect(trend[0]!.week).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("跨周的数据分入不同周桶并按周排序", () => {
    const trend = errorCauseTrend([
      entry("2026-09-01T10:00:00.000Z", "计算错误", "d"),
      entry("2026-08-24T10:00:00.000Z", "计算错误", "a"),
    ]);
    expect(trend).toHaveLength(2);
    expect(trend[0]!.week < trend[1]!.week).toBe(true);
  });

  it("不同错因在同周内分别计数", () => {
    const trend = errorCauseTrend([
      entry("2026-08-24T10:00:00.000Z", "计算错误", "a"),
      entry("2026-08-25T10:00:00.000Z", "审题错误", "b"),
    ]);
    expect(trend).toHaveLength(2);
    expect(new Set(trend.map((row) => row.week)).size).toBe(1);
  });
});
