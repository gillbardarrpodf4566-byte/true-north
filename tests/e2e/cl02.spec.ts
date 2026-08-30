import { expect, test } from "@playwright/test";

/**
 * CL-02 每日学习处方闭环（xlsx 闭环用户旅程）：
 * 感知（读画像/可用时间）→ 处方（1–3 项，含目标/时长/完成标准）→ 执行入口。
 * 屏幕：§11.4 Diagnostic Result / §11.2 Today（Horizon Focus）。
 *
 * 前置：复用 CL-01 建档（本用例自行走一遍最短建档路径）。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function completeOnboardingAndImport(page: import("@playwright/test").Page) {
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
    name: "fb-cl02.png",
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

test("CL-02 每日处方闭环：诊断结论 → 1-3 项处方 → 进入训练", async ({ page }) => {
  await completeOnboardingAndImport(page);

  // Today：单一焦点 + 主 CTA（§11.2 / §9.1）
  const focus = page.getByRole("region", { name: "今日焦点" });
  await expect(focus).toBeVisible();
  await expect(page.getByRole("heading", { name: "今日处方" })).toBeVisible();

  // 处方 1–3 项，每项都有成功判定与「为什么今天」（F0104/F0059/F0112）
  const cards = page.locator("article", { hasText: "成功判定" });
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);
  await expect(cards.first().getByText("为什么今天")).toBeVisible();
  await expect(cards.first().getByText("预估时间")).toBeVisible();

  // 「为什么是这个？」→ 诊断页，含机会排序与证据（F0092/F0096）
  await focus.getByRole("button", { name: "为什么是这个？" }).click();
  await page.waitForURL(/\/diagnosis(\?|$)/);
  await expect(page.locator("figcaption", { hasText: "提分机会排序" })).toBeVisible();
  await expect(page.getByText("机会 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "收起依据" }).first()).toBeVisible();

  // 诊断 → 一键生成处方（F0101）回到今日
  await page.getByRole("button", { name: "生成今日处方" }).click();
  await page.waitForURL(/\/today(\?|$)/);

  // 一键进入训练（F0057）
  await page.locator("article").first().getByRole("button", { name: "开始训练" }).click();
  await page.waitForURL(/\/train\/session\//);
});

test("F0054 今日可用时间缩放：改为 20 分钟后总时长不超预算", async ({ page }) => {
  await completeOnboardingAndImport(page);

  await page.getByRole("button", { name: /今天只有/ }).click();
  await page.getByRole("group", { name: "今日可用时间" }).getByRole("button", { name: "20 分钟" }).click();

  await expect(page.getByRole("button", { name: "今天只有 20 分钟？" })).toBeVisible();
  const minutes = await page.locator("article dd", { hasText: "分钟" }).allInnerTexts();
  const total = minutes
    .map((t) => Number(t.replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n))
    .reduce((s, n) => s + n, 0);
  expect(total).toBeLessThanOrEqual(20);
});
