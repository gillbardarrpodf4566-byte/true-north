import { expect, test } from "@playwright/test";

/**
 * CL-07 周复盘与再校准闭环 + CL-04 模考触发重诊断 + CL-09 会员最小闭环。
 * 前置：建档 + 导入（复用流程）→ 训练/模考产生一周数据 → 周复盘确认 → 会员订单。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function setup(page: import("@playwright/test").Page) {
  await page.goto("/onboarding");
  await page.getByLabel(/用户协议/).check();
  await page.getByLabel(/能力边界/).check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "国考" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("考试批次").fill("2026年国考");
  await page.getByLabel("目标地区").fill("广东省");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("考试日期").fill("2026-11-29");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("目标总分").fill("110");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("group", { name: "工作日" }).getByRole("button", { name: "60 分钟" }).click();
  await page.getByRole("group", { name: "周末" }).getByRole("button", { name: "120 分钟" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "强化", exact: true }).click();
  await page.getByRole("button", { name: "完成建档" }).click();
  await page.waitForURL(/\/import(\?|$)/);
  await page.setInputFiles('input[type="file"]', {
    name: "fb-cl07.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByText("识别结果 · 请确认")).toBeVisible({ timeout: 15000 });
  const confirmButtons = page.getByRole("button", { name: "已核对" });
  for (let i = await confirmButtons.count(); i > 0; i--) {
    await confirmButtons.first().click();
  }
  await page.getByRole("button", { name: "确认无误，写入档案" }).click();
  await page.waitForURL(/\/baseline(\?|$)/);
  await page.getByRole("button", { name: "进入今日" }).click();
  await page.waitForURL(/\/today(\?|$)/);
}

test("CL-04/07：模考 → 重新诊断 → 趋势可见 → 周复盘确认 → 已重排", async ({ page }) => {
  await setup(page);

  // 整卷模考（§11.11 考中低噪声：无 AI 提示按钮）
  await page.getByRole("navigation", { name: "主导航" }).getByText("训练").click();
  await page.waitForURL(/\/train(\?|$)/);
  await page.goto("/mock");
  await page.getByRole("button", { name: "确认，开始模考" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("button", { name: "AI 提示" })).toHaveCount(0);

  // 答完全卷（正确项带 data-correct 标记；末题用主按钮交卷）
  for (let i = 0; i < 10; i++) {
    await page.locator('button[data-correct="1"][role="radio"]').first().click();
    const isLast = i === 9;
    if (isLast) {
      await page.getByRole("button", { name: "交卷" }).last().click();
    } else {
      await page.getByRole("button", { name: "下一题" }).click();
    }
  }

  // 报告：总分 + 模块表现 + 数据入模
  await expect(page.getByText("模考报告")).toBeVisible();
  await page.getByRole("button", { name: "查看更新后的诊断" }).click();
  await page.waitForURL(/\/diagnosis(\?|$)/);
  await expect(page.locator("figcaption", { hasText: "提分机会排序" })).toBeVisible();

  // 趋势（F0277/F0278）
  await page.getByRole("navigation", { name: "主导航" }).getByText("进展").click();
  await page.waitForURL(/\/progress(\?|$)/);
  await expect(page.getByRole("link", { name: /本周复盘/ })).toBeVisible();

  // 周复盘：叙事顺序 → 确认下周重点 → 已重排（禁止静默改变下周目标）
  await page.getByRole("link", { name: /本周复盘/ }).click();
  await page.waitForURL(/\/progress\/weekly(\?|$)/);
  await expect(page.getByText("有效变化")).toBeVisible();
  await expect(page.getByText("下周重点（确认后生效）")).toBeVisible();
  await page.getByRole("button", { name: /确认 \d+ 个下周重点/ }).click();
  await expect(page.getByText("已重排", { exact: true })).toBeVisible();
});

test("CL-09：免费额度展示 → 权益对比 → 模拟支付成功 → 订单记录", async ({ page }) => {
  await setup(page);
  await page.getByRole("navigation", { name: "主导航" }).getByText("我的").click();
  await page.getByText("订阅与权益").click();
  await page.waitForURL(/\/membership(\?|$)/);

  await expect(page.getByText("权益对比")).toBeVisible();
  await expect(page.getByText(/本周诊断额度/)).toBeVisible();

  await page.getByRole("button", { name: /年度 Pro/ }).click();
  await page.getByRole("button", { name: "确认订阅（模拟支付）" }).click();
  await expect(page.getByText("订阅成功，Pro 权益已即时开通。")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("订单记录")).toBeVisible();
});
