import { expect, test } from "@playwright/test";

/**
 * F0001 启动页 / F0003 短信登录 / F0008 通知权限 / F0009 相册授权门 /
 * F0013 重发倒计时 / F0014 异常登录恢复路径。
 * 短信为 mock 通道：验证码直接回显在页面上，E2E 读取回显完成登录。
 */

const uniquePhone = (): string =>
  "139" + String(Date.now()).slice(-8); // 每次运行独立手机号，避免 cooldown 串场

test("F0003/F0013/F0014 登录：发送→回显→错码原因→正确登录→启动页进入", async ({ page }) => {
  await page.goto("/login");
  const phone = uniquePhone();
  await page.getByLabel("手机号").fill(phone);

  // 冷却/倒计时：发送后出现重发倒计时（F0013）
  await page.getByRole("button", { name: "获取验证码" }).click();
  await expect(page.getByText(/【模拟短信】验证码 \d{6}/)).toBeVisible();
  const code = (await page.getByText(/【模拟短信】验证码 (\d{6})/).textContent())!.replace(/\D/g, "").slice(-6);
  await expect(page.getByText(/\d+s 后可重发/)).toBeVisible();

  // F0014：错误验证码 → 具体原因与剩余次数，不是笼统报错
  await page.getByLabel("验证码").fill("000000");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByText(/验证码不正确，还可尝试 \d+ 次/)).toBeVisible();

  // 正确验证码 → 登录成功 → 启动页路由到新用户引导
  await page.getByLabel("验证码").fill(code);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/(today|onboarding)(\?|$)/);
});

test("F0001 启动页：品牌标记可见，随后路由到引导（新访客）", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("每一步清晰的努力，都会把你带到岸边。")).toBeVisible();
  await page.waitForURL(/\/onboarding(\?|$)/, { timeout: 15000 });
});

test("F0009 相册授权门：说明→授权→上传入口出现", async ({ page }) => {
  await page.goto("/import");
  await expect(page.getByText("允许见岸读取你的成绩截图吗？")).toBeVisible();
  await page.getByRole("button", { name: "授权并继续" }).click();
  await expect(page.getByText("点击选择成绩截图")).toBeVisible();
  // input 常驻可程序化选择（权限门不阻塞自动化与可访问树）
  await expect(page.locator("#score-file-input")).toHaveCount(1);
});
