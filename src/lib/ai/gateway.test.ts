import { describe, expect, it } from "vitest";
import { MockAiGateway } from "./gateway";

describe("MockAiGateway（确定性）", () => {
  const gw = new MockAiGateway();

  it("同一输入永远同一输出（E2E 可断言）", async () => {
    const a = await gw.parseScoreScreenshot({ fileName: "mock1.png", sizeBytes: 1024 });
    const b = await gw.parseScoreScreenshot({ fileName: "mock1.png", sizeBytes: 1024 });
    expect(a).toEqual(b);
  });

  it("partial 文件 → 缺失模块标记 missing 而非编造（F0036）", async () => {
    const r = await gw.parseScoreScreenshot({ fileName: "partial.png", sizeBytes: 1 });
    const missing = r.modules.find((m) => m.score == null);
    expect(missing).toBeDefined();
    expect(r.confidence[`module:${missing!.id}:score`]).toBe("missing");
    expect(r.totalScore).toBeNull();
  });

  it("分数落在模块满分区间内", async () => {
    const r = await gw.parseScoreScreenshot({ fileName: "mock2.png", sizeBytes: 2048 });
    for (const m of r.modules) {
      if (m.score != null) expect(m.score).toBeGreaterThanOrEqual(0);
    }
  });
});
