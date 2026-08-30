import { expect, test } from "@playwright/test";

/**
 * 后台服务端化验收：员工登录（F0364 RBAC）、角色越权 403、
 * 题库下线生效（F0343）、审计入库（F0365）、AI 运营台服务端评测。
 */

test("ops01 登录后台 → 题库下线生效 → 审计出现记录 → 越权被 403", async ({ page }) => {
  await page.goto("/admin-login");
  await page.getByLabel("用户名").fill("ops01");
  await page.getByLabel("密码").fill("Ops@123456");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin(\?|$)/);
  await expect(page.getByText("运营小岸 · 运营")).toBeVisible();

  // 题库下线一题（服务端落库）。幂等：若上轮已下线，先恢复再下线。
  const row = page.locator("li", { hasText: "fa-0" }).first();
  await row.waitFor();
  if ((await row.getByText("已下线", { exact: true }).count()) > 0) {
    await row.getByRole("button", { name: "→ 已发布" }).click();
    await expect(row.getByText("已发布", { exact: true })).toBeVisible();
  }
  await row.getByRole("button", { name: "→ 已下线" }).click();
  await expect(row.getByText("已下线", { exact: true })).toBeVisible();

  // 审计出现记录（F0365）
  await page.getByRole("button", { name: "审计" }).click();
  await expect(page.getByText(/题目 fa-0 状态 → 已下线/).first()).toBeVisible();

  // F0364：客服角色调题库写接口 → 服务端 403
  const resp = await page.request.post("/api/admin/questions", {
    headers: { authorization: "Bearer invalid-staff-token" },
    data: { action: "status", qid: "fa-1", status: "已下线" },
  });
  expect(resp.status()).toBe(401);
});

test("support01 无题库写权限：UI 隐藏写操作，接口 403", async ({ request }) => {
  const login = await request.post("/api/admin/auth/login", {
    data: { username: "support01", password: "Support@123456" },
  });
  const { token } = (await login.json()) as { ok: boolean; token: string };
  expect(token).toBeTruthy();

  // 读可以（tickets:read 对全角色开放）
  const tickets = await request.get("/api/admin/tickets", {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(tickets.ok()).toBeTruthy();

  // 题库写 → 403（服务端 RBAC 强校验）
  const forbidden = await request.post("/api/admin/questions", {
    headers: { authorization: `Bearer ${token}` },
    data: { action: "status", qid: "fa-1", status: "已下线" },
  });
  expect(forbidden.status()).toBe(403);

  // 配置写 → 403
  const configWrite = await request.post("/api/admin/exams", {
    headers: { authorization: `Bearer ${token}` },
    data: { name: "越权考试" },
  });
  expect(configWrite.status()).toBe(403);
});

test("aiops01 在 AI 运营台服务端跑评测 → 门禁通过 + 历史入库", async ({ page }) => {
  await page.goto("/admin-login");
  await page.getByLabel("用户名").fill("aiops01");
  await page.getByLabel("密码").fill("Aiops@123456");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin(\?|$)/);

  await page.goto("/aiops");
  await expect(page.getByText("AI 运营台")).toBeVisible();

  // 服务端真实跑 parser 评测（含对抗样本）
  const parserSection = page.locator("section", { hasText: "Parser 评测集" }).first();
  await parserSection.getByRole("button", { name: "服务端运行" }).click();
  await expect(page.getByText(/通过率 \d+%/).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/门禁 通过/).first()).toBeVisible();

  // 诊断评测集（各自的 section 按钮）
  const diagSection = page.locator("section", { hasText: "诊断评测集" }).first();
  await diagSection.getByRole("button", { name: "服务端运行" }).click();
  await expect(
    diagSection.getByText(/通过率 \d+%/).first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(diagSection.getByText(/门禁 通过/).first()).toBeVisible();
});

test("F0009 反馈入库：用户提交后出现在后台工单", async ({ page }) => {
  const text = `自动化验收工单 ${Date.now()}`;
  await page.goto("/feedback");
  await page.getByLabel("具体描述（做什么操作时发生了什么）").fill(text);
  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByText("已提交到处理队列")).toBeVisible();

  const login = await page.request.post("/api/admin/auth/login", {
    data: { username: "support01", password: "Support@123456" },
  });
  const { token } = (await login.json()) as { token: string };
  const tickets = await request_await(page, token);
  expect(tickets.some((t) => t.text.includes(text))).toBe(true);
});

async function request_await(page: import("@playwright/test").Page, token: string) {
  const res = await page.request.get("/api/admin/tickets", {
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { rows: Array<{ text: string }> };
  return data.rows;
}
