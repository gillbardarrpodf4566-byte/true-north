import { expect, test } from "@playwright/test";

/**
 * V1 关键扩展 GUI 回归：
 * - F0004/F0005 第三方登录与绑定
 * - F0039–F0049 外部历史/练习/错题 JSON 数据接入
 * - F0023/F0025/F0026/F0325/F0328/F0329 偏好与隐私实际持久化控件
 */

test("V1 第三方登录：微信 mock identity 首次或复访均进入已认证区域", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "微信快捷登录" }).click();
  await page.waitForURL(/\/(?:onboarding|today)(?:\?|$)/);
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
});

test("V1 外部数据中心：历史 JSON 校验→导入成功，练习/错题模式可切换", async ({ page }) => {
  await page.goto("/import/advanced");
  await expect(page.getByRole("heading", { name: "外部数据中心" })).toBeVisible();

  // 默认历史模考示例已合法，导入应成功（F0039/F0048）
  await page.getByRole("button", { name: "校验并导入" }).click();
  await expect(page.getByText(/已导入 1 场历史模考/)).toBeVisible();

  // 练习记录模式（F0042/F0044）
  await page.getByRole("tab", { name: "练习结果（F0042/F0044）" }).click();
  await page.getByRole("button", { name: "校验并导入" }).click();
  await expect(page.getByText(/已导入 1 条练习记录/)).toBeVisible();

  // 外部错题模式（F0043，未知错因不编造）
  await page.getByRole("tab", { name: "外部错题（F0043）" }).click();
  await page.getByRole("button", { name: "校验并导入" }).click();
  await expect(page.getByText(/错因保持未知/)).toBeVisible();
});

test("V1 偏好与隐私：教练风格/个性化/截图策略控件可操作", async ({ page }) => {
  await page.goto("/me");
  await expect(page.getByText("学习偏好与教练风格")).toBeVisible();

  await page.getByLabel("教练风格").selectOption("苏格拉底式");
  await expect(page.getByLabel("教练风格")).toHaveValue("苏格拉底式");

  const personalization = page.getByRole("switch", { name: "基于学习行为的个性化推荐（F0329）" });
  await personalization.click();
  await expect(personalization).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "确认后自动删除" }).click();
  await expect(page.getByRole("button", { name: "确认后自动删除" })).toHaveAttribute("aria-pressed", "true");
});
