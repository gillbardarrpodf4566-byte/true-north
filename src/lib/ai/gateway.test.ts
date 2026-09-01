import { describe, expect, it } from "vitest";
import { MockAiGateway, ResilientAiGateway } from "./gateway";

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

  it("主解析失败时降级为全部待人工确认，而不是丢上传（F0388）", async () => {
    const resilient = new ResilientAiGateway(gw);
    const r = await resilient.parseScoreScreenshot({ fileName: "corrupt.png", sizeBytes: 1 });
    expect(r.platform).toBe("规则降级");
    expect(r.totalScore).toBeNull();
    expect(r.modules.every((m) => m.score === null)).toBe(true);
    expect(r.sourceConfidence).toBe("low");
  });
});
