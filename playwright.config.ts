import { defineConfig, devices } from "@playwright/test";
import { E2E_STAFF_BOOTSTRAP_JSON } from "./tests/e2e/fixtures/staff";

/** E2E 跑生产构建（pnpm build 产物），比 dev server 启动快且更接近真实。 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1, // 串行执行：并行下 Windows 生产服务器偶发 ChunkLoadError（连接被重置）
  forbidOnly: !process.env.CI,
  retries: process.env.CI ? 2 : 1, // 本地重试吸收偶发 ChunkLoadError（生产服务器并行压力下观察到）
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3457",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next start -p 3457 -H 127.0.0.1",
    env: {
      ...process.env,
      JIANAN_ALLOW_MOCK_OAUTH: "1",
      JIANAN_ALLOW_MOCK_SMS: "1",
      JIANAN_BOOTSTRAP_STAFF_JSON: E2E_STAFF_BOOTSTRAP_JSON,
    },
    url: "http://127.0.0.1:3457/onboarding",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
  },
});
