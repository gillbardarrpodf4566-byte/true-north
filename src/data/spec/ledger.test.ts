import { describe, expect, it } from "vitest";
import features from "@/data/spec/features.json";
import loops from "@/data/spec/loops.json";
import stateMachines from "@/data/spec/state-machines.json";

type Feature = {
  id: string;
  surface: string;
  module: string;
  priority: string;
  version: string;
  loop: string;
};

describe("功能台账（功能清单 v1.0 管线）", () => {
  const list = features as Feature[];

  it("全量 388 条且 ID 唯一", () => {
    expect(list).toHaveLength(388);
    expect(new Set(list.map((f) => f.id)).size).toBe(388);
  });

  it("优先级分布 P0 137 / P1 191 / P2 60", () => {
    const byPriority = countBy(list, (f) => f.priority);
    expect(byPriority).toEqual({ P0: 137, P1: 191, P2: 60 });
  });

  it("MVP 171 条，其中 P0 118", () => {
    const mvp = list.filter((f) => f.version === "MVP");
    expect(mvp).toHaveLength(171);
    expect(mvp.filter((f) => f.priority === "P0")).toHaveLength(118);
  });

  it("端分布 用户端 334 / 管理后台 31 / AI运营台 23", () => {
    const bySurface = countBy(list, (f) => f.surface);
    expect(bySurface).toEqual({ 用户端: 334, 管理后台: 31, AI运营台: 23 });
  });

  it("闭环旅程 10 条 47 步", () => {
    const loopIds = new Set(loops.map((l) => (l as { loopId: string }).loopId));
    expect(loopIds.size).toBe(10);
    expect(loops).toHaveLength(47);
  });

  it("状态机 29 行", () => {
    expect(stateMachines).toHaveLength(29);
  });
});

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
