/**
 * E2E 专用员工账号：仅通过 Playwright webServer 环境变量注入，
 * 生产运行时若未配置引导账号则 staff 表保持为空（登录失败关闭）。
 */
export interface E2eStaffFixture {
  username: string;
  password: string;
  role: "operations" | "teaching" | "support" | "aiops" | "admin";
  displayName: string;
}

export const E2E_STAFF: E2eStaffFixture[] = [
  { username: "e2e-ops", password: "E2eOps#2026pass", role: "operations", displayName: "E2E运营" },
  { username: "e2e-teacher", password: "E2eTeach#2026pass", role: "teaching", displayName: "E2E教研" },
  { username: "e2e-support", password: "E2eSupport#2026pass", role: "support", displayName: "E2E客服" },
  { username: "e2e-aiops", password: "E2eAiops#2026pass", role: "aiops", displayName: "E2E AI运营" },
  { username: "e2e-admin", password: "E2eAdmin#2026pass", role: "admin", displayName: "E2E管理员" },
  { username: "e2e-throttle", password: "E2eThrottle#2026pass", role: "support", displayName: "E2E节流专用" },
];

export const E2E_STAFF_BOOTSTRAP_JSON = JSON.stringify(E2E_STAFF);

export function staffFixture(role: E2eStaffFixture["role"] | "throttle"): E2eStaffFixture {
  const username = role === "throttle" ? "e2e-throttle" : `e2e-${role === "operations" ? "ops" : role === "teaching" ? "teacher" : role}`;
  const found = E2E_STAFF.find((entry) => entry.username === username);
  if (!found) throw new Error(`未定义的 E2E 员工角色：${role}`);
  return found;
}
