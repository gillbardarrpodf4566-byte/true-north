import { expect, test } from "@playwright/test";

/**
 * CL-03 单次训练与错因修复闭环（xlsx 闭环用户旅程）：
 * 选题（处方/专项）→ 作答（计时/跳题）→ 即时反馈 → 错因判断与确认 → 数据入模。
 * 屏幕：§11.5 Practice Hub / §11.6 Training Session / §11.7 错题与反馈。
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function onboardAndImport(page: import("@playwright/test").Page) {
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
  await page
    .getByRole("group", { name: "工作日" })
    .getByRole("button", { name: "60 分钟" })
    .click();
  await page
    .getByRole("group", { name: "周末" })
    .getByRole("button", { name: "120 分钟" })
    .click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "强化", exact: true }).click();
  await page.getByRole("button", { name: "完成建档" }).click();
  await page.waitForURL(/\/import(\?|$)/);
    await page.getByRole("button", { name: "授权并继续" }).click();
  await expect(page.getByText("点击选择成绩截图")).toBeVisible();
await page.setInputFiles('input[type="file"]', {
    name: "fb-cl03.png",
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

test("CL-03 训练闭环：作答→即时反馈→错因→总结→数据入模→错题本", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.stack?.slice(0, 600)));
  await onboardAndImport(page);

  // 从训练中心进入专项（自由训练）
  await page.getByRole("navigation", { name: "主导航" }).getByText("训练").click();
  await page.waitForURL(/\/train(\?|$)/);
  await page.getByRole("link", { name: /资料分析 \d+ 题题组/ }).click();
  await page.waitForURL(/\/train\/session\//);

  // 开始 → 逐题作答（先故意答错第一题）
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await expect(page.getByText("提交本题")).toBeVisible();

  // 第一题：fa-0 的正确项在位置 A（rot=0 不打乱），选最后一项必错
  await page.getByRole("radio").last().click();
  await page.getByRole("button", { name: "提交本题" }).click();

  // §8.13：错误反馈不 shake，正确答案保持可见（§7.10）
  await expect(page.getByText(/这次错了。用时/)).toBeVisible();
  await expect(page.locator('button[data-correct="1"]')).toBeVisible();
  await expect(page.getByText("解析")).toBeVisible();

  // 第二题答对
  await page.getByRole("button", { name: "下一题" }).click();
  await page.locator('button[data-correct="1"][role="radio"]').first().click();
  await page.getByRole("button", { name: "提交本题" }).click();
  await expect(page.getByText("对。用时")).toBeVisible();

  // 第三题答对后进入第四题，用工具条的「结束训练」提前结束（自由训练共 8 题）
  await page.getByRole("button", { name: "下一题" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();

  // §11.7/F0141：总结 + 错因构成 + 数据入模
  await expect(page.getByText("训练总结")).toBeVisible();
  await expect(page.getByText("错因构成")).toBeVisible();
  await expect(page.getByText("与个人基线比较")).toBeVisible();

  // 错题本：答错自动入库（F0149）+ 错因确认（F0157）
  await page.getByRole("button", { name: "确认错因并修复" }).click();
  await page.waitForURL(/\/train\/wrongbook(\?|$)/);
  await expect(page.getByText("AI 建议")).toBeVisible();
  await page.getByRole("button", { name: "认可这个错因" }).click();
  await expect(page.getByText("修复建议")).toBeVisible();
  await expect(page.getByRole("button", { name: /近邻题复测/ })).toBeVisible();
});

test("训练草稿：选择与反馈重载后保持，题级时间不会被会话平均化", async ({ page }) => {
  await page.goto("/train/session/free-%E8%B5%84%E6%96%99%E5%88%86%E6%9E%90");
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.getByRole("radio").last().click();
  await page.waitForTimeout(1100);

  // 页面隐藏时主动暂停；恢复后仍保留未提交的选择和本题累计时间。
  await page.reload();
  await expect(page.getByText("训练已暂停")).toBeVisible();
  await page.getByRole("button", { name: "继续作答" }).click();
  await expect(page.getByRole("radio").last()).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/^本题 00:0[1-9]$/)).toBeVisible();

  await page.getByRole("button", { name: "提交本题" }).click();
  await expect(page.getByText(/这次错了。用时 00:0[1-9]/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("解析")).toBeVisible();
  await expect(page.getByRole("button", { name: "下一题" })).toBeVisible();

  await page.getByRole("button", { name: "下一题" }).click();
  await expect(page.getByText(/^本题 00:00$/)).toBeVisible();
  await page.getByRole("button", { name: "结束训练" }).click();
  await expect(page.getByText("训练总结")).toBeVisible();

  // 完成记录不携带草稿，训练中心不应再展示继续入口。
  await page.goto("/train");
  await expect(page.getByText("继续上次")).toHaveCount(0);
});

test("F0133 跳题：跳过不参与作答，可正常结束", async ({ page }) => {
  await onboardAndImport(page);
  await page.getByRole("navigation", { name: "主导航" }).getByText("训练").click();
  await page.getByRole("link", { name: /言语理解 \d+ 题题组/ }).click();
  await page.waitForURL(/\/train\/session\//);
  await page.getByRole("button", { name: "开始", exact: true }).click();

  await page.getByRole("button", { name: "跳过，稍后回看" }).click();
  await page.locator('button[data-correct="1"][role="radio"]').first().click();
  await page.getByRole("button", { name: "提交本题" }).click();
  await page.getByRole("button", { name: "下一题" }).click();
  await page.getByRole("button", { name: "结束训练" }).click();

  await expect(page.getByText("训练总结")).toBeVisible();
});
