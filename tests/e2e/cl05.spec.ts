import { expect, test } from "@playwright/test";

/**
 * CL-05 申论批改与重写闭环（V1）：
 * 选题（F0198/0199）→ 作答（F0201/0203）→ 批改（F0204–F0213）→ 重写（F0216/0217）→ 报告（F0224–0226）。
 * 屏幕：§11.12 Essay。
 */

const WEAK = "S市搞了很多智慧化建设，老百姓办事方便了，基层也减负了，效果挺好。";

const GOOD = [
  "S市推进基层智慧治理的做法主要有以下几方面。一是建平台强统筹：依托一网统管平台，将网格上报、市民热线、物联感知统一接入，事件自动分派、限时办结，处置时间明显缩短。",
  "二是发动群众参与：推行随手拍小程序，居民上报后就近派单处置。",
  "三是再造政务服务：实行免申即享，通过数据比对实现政策找人，补贴直达；上线一表通，精简基层报表，减轻台账负担。",
  "四是守护特殊群体：为独居老人安装水表智感设备，异常自动预警，社区上门处置。",
  "上述做法提升了基层治理效率，也增强了群众的获得感和满意度。",
].join("\n");

test("CL-05 申论闭环：弱作答批改 → 优先改三点 → 重写 → 前后对比 → 报告", async ({ page }) => {
  await page.goto("/essay");
  await expect(page.getByRole("heading", { name: "申论教练" })).toBeVisible();

  // 进入概括题（真题标识 F0199）
  await page.getByText("概括S市推进基层智慧治理的主要做法").click();
  await expect(page.getByText("2025 国考")).toBeVisible();

  // 作答区：实时字数（F0203）
  await page.getByLabel("申论作答").fill(WEAK);
  await expect(page.getByText(/\/ 300 字/)).toBeVisible();

  // 提交批改 → 参考分 + 低置信 + 优先改三点（F0204/F0212/F0213）
  await page.getByRole("button", { name: "提交批改" }).click();
  await expect(page.getByText("批改结果 · 参考性质")).toBeVisible();
  await expect(page.getByText("置信 低")).toBeVisible();
  await expect(page.getByText("优先修改（最多三点）")).toBeVisible();
  const fixCount = await page.locator("ol >> li").filter({ hasText: /漏答|字数|结构|冗余|表达/ }).count();
  expect(fixCount).toBeLessThanOrEqual(3);

  // 证据引用：漏点带材料依据（F0207/F0211）
  await page.getByText("查看全部得分点对照（证据引用）").click();
  await expect(page.getByText(/材料依据：「/).first()).toBeVisible();

  // 重写：填入好答案 → 前后对比（F0216/F0217）
  await page.getByLabel("申论作答").fill(GOOD);
  await page.getByRole("button", { name: "提交批改" }).click();
  await expect(page.getByText("前后对比")).toBeVisible();
  await expect(page.getByText(/新采到要点/)).toBeVisible();
  await expect(page.getByText(/参考分提高/)).toBeVisible();

  // 能力画像更新（F0218）→ hub 出现专项弱项推荐
  await page.goto("/essay");
  await expect(page.getByText("专项弱项推荐 · 概括")).toBeVisible();

  // 报告：趋势 + 高频问题 + 专项处方（F0224–F0226）
  await page.getByText(/查看申论报告/).click();
  await page.waitForURL(/\/essay\/report(\?|$)/);
  await expect(page.getByText("高频问题")).toBeVisible();
  await expect(page.getByText("下周专项处方")).toBeVisible();
});
