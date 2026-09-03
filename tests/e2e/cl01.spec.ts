import { expect, test } from "@playwright/test";

/**
 * CL-01 首次建档与基线闭环（xlsx 闭环用户旅程）：
 * 协议 → 目标建档 → 上传截图 → AI 解析 → 逐项确认 → 入库 → 基线 v0。
 * 对应屏幕：DESIGN.md §11.1 Onboarding / §11.3 Diagnostic Import。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("CL-01 首次建档闭环：注册目标→上传→确认→基线→今日", async ({ page }) => {
  await page.goto("/");

  // 根路由门控 → onboarding
  await page.waitForURL(/\/onboarding(\?|$)/);

  // Step 0：协议 + AI 边界（F0006/F0007）
  await expect(page.getByText("看清你为什么")).toBeVisible();
  await page.getByLabel(/用户协议/).check();
  await page.getByLabel(/能力边界/).check();
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 1：考试类型（F0015）
  await page.getByRole("button", { name: "国考" }).click();
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 2：批次与地区（F0016）
  await page.getByLabel("考试批次").fill("2026年国考");
  await page.getByLabel("目标地区").fill("广东省");
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 3：考试日期（F0017）
  await page.getByLabel("考试日期").fill("2026-11-29");
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 4：目标分数（F0018）
  await page.getByLabel("目标总分").fill("140");
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 5：每日时间（F0020）
  await page.getByRole("group", { name: "工作日" }).getByRole("button", { name: "30 分钟" }).click();
  await page.getByRole("group", { name: "周末" }).getByRole("button", { name: "120 分钟" }).click();
  await page.getByRole("button", { name: "下一步" }).click();

  // Step 6：备考阶段（F0022）
  await page.getByRole("button", { name: "基础", exact: true }).click();
  await page.getByRole("button", { name: "完成建档" }).click();

  // → /import（§11.3）
  await page.waitForURL(/\/import(\?|$)/);
  await expect(page.getByRole("heading", { name: "导入模考成绩" })).toBeVisible();

  // 上传截图（F0030）→ 解析阶段文案 → 确认页
    await page.getByRole("button", { name: "授权并继续" }).click();
  await expect(page.getByText("点击选择成绩截图")).toBeVisible();
await page.setInputFiles('input[type="file"]', {
    name: "fb-mock-1.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByText("识别结果 · 请确认")).toBeVisible({ timeout: 15000 });

  // 低置信/缺失字段：确认或补录后才能提交（F0035/F0036）
  const confirmButtons = page.getByRole("button", { name: "已核对" });
  const count = await confirmButtons.count();
  for (let i = 0; i < count; i++) {
    await confirmButtons.first().click();
  }
  const submit = page.getByRole("button", { name: "确认无误，写入档案" });
  await expect(submit).toBeEnabled();
  await submit.click();

  // → /baseline（基线 v0，冷启动/低可信文案，无伪精确分数）
  await page.waitForURL(/\/baseline(\?|$)/);
  await expect(page.getByText("个人基线 · 第一版")).toBeVisible();
  await expect(page.getByText("资料分析")).toBeVisible();

  // 进入今日 → App Shell 底部导航可用
  await page.getByRole("button", { name: "进入今日" }).click();
  await page.waitForURL(/\/today(\?|$)/);
  // 「今日焦点」是焦点区的无障碍名称（section aria-label）。
  // 视觉层不再渲染装饰性 eyebrow 文本，因此断言区域角色而非文本节点。
  await expect(page.getByRole("region", { name: "今日焦点" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
});

test("无数据访问基线页 → §18.2 空态指引", async ({ page }) => {
  await page.goto("/baseline");
  await expect(page.getByText("还没有成绩数据，无法建立基线。")).toBeVisible();
});
