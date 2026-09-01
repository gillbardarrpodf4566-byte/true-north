import { expect, test } from "@playwright/test";
import { staffFixture } from "./fixtures/staff";

const ops = staffFixture("operations");

/**
 * CL-08 选岗决策闭环（V1）：
 * 建档（F0257/0258）→ 确定性过滤（F0259/0260）→ 冲稳保排序（F0264/0265）→
 * 对比（F0271）→ 目标联动提示；含后台职位导入（F0352）后匹配生效。
 */

test("CL-08 选岗闭环：建档 → 匹配 → 可报/不可报 → 收藏 → 对比 → 目标联动", async ({ page }) => {
  await page.goto("/jobs");

  // 建档：本科计算机党员（F0257/F0258）
  await page.getByLabel("专业").fill("计算机科学与技术");
  await page.getByLabel("学历").selectOption("本科");
  await page.getByLabel("政治面貌").selectOption("中共党员");
  await page.getByLabel("基层工作年限").fill("0");
  await page.getByRole("button", { name: "开始匹配" }).click();

  // 结果：可报列表 + 匹配理由 + 数据来源（F0265/F0270）
  await expect(page.getByText("匹配结果")).toBeVisible();
  await expect(page.getByText(/数据来源：/).first()).toBeVisible();
  await expect(page.getByText(/约 \d+(\.\d+)?:1/).first()).toBeVisible();

  // 不可报折叠区存在且有逐条原因（F0260）
  await page.getByText(/不可报职位与原因（\d+）/).click();
  await expect(page.getByText(/✗ 学历：/).first()).toBeVisible();

  // 收藏（F0273）：访客收藏在独立 guest profile 中，登录后才同步服务器。
  const firstJob = page.locator("li", { hasText: "市税务局一级行政执法员" }).first();
  const existingCancel = firstJob.getByRole("button", { name: "取消收藏" });
  if (await existingCancel.count()) await existingCancel.click();
  await firstJob.getByRole("button", { name: "收藏" }).click();
  await expect(firstJob.getByRole("button", { name: "取消收藏" })).toBeVisible();

  // 对比 3–5 个（F0271）
  const compareBoxes = page.getByRole("checkbox", { name: "对比" });
  await compareBoxes.nth(0).check();
  await expect(compareBoxes.nth(0)).toBeChecked();
  await expect(page.getByText("已选 1/5 对比")).toBeVisible();
  // 状态更新会重渲染列表，重新查询第二个 checkbox，避免 stale locator。
  const refreshedBoxes = page.getByRole("checkbox", { name: "对比" });
  await refreshedBoxes.nth(1).check();
  await expect(refreshedBoxes.nth(1)).toBeChecked();
  await expect(page.getByText("已选 2/5 对比")).toBeVisible();
  await expect(page.getByText(/职位对比（2 个/)).toBeVisible();

  // 目标联动提示（CL-08 step5）
  await expect(page.getByText(/目标设置/)).toBeVisible();
});

test("后台导入新职位后，用户匹配可见（F0352 → CL-08）", async ({ page }) => {
  // ops01 导入一个新职位
  await page.goto("/admin-login");
  await page.getByLabel("用户名").fill(ops.username);
  await page.getByLabel("密码").fill(ops.password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin(\?|$)/);
  await page.getByRole("button", { name: "配置" }).click();
  await page.getByText("批量导入职位表（JSON，F0352）").click();

  const row = {
    id: "job-e2e-9",
    name: "E2E测试大数据岗",
    department: "E2E局",
    region: "广州市",
    unitLevel: "市级",
    minEducation: "本科",
    majorCategories: ["计算机类"],
    recruiting: 2,
    politicalRequirement: "群众",
    sourceName: "E2E测试来源",
    sourceFile: "e2e-positions.json",
    sourceUpdatedAt: "2026-08-31",
  };
  await page.getByLabel("职位 JSON").fill(JSON.stringify([row]));
  await page.getByRole("button", { name: "校验并导入" }).click();
  await expect(page.getByText(/导入成功 1 条/)).toBeVisible();

  // 用户匹配：计算机本科应能看到新职位
  await page.goto("/jobs");
  await page.getByLabel("专业").fill("计算机科学与技术");
  await page.getByLabel("学历").selectOption("本科");
  await page.getByRole("button", { name: "开始匹配" }).click();
  await expect(page.getByText("E2E测试大数据岗")).toBeVisible({ timeout: 10000 });
});
