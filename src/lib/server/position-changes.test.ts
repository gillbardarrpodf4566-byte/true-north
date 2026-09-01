import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "jianan-pos-changes-"));
process.env.JIANAN_DB_PATH = join(dir, "test.db");
process.env.JIANAN_BOOTSTRAP_STAFF_JSON = JSON.stringify([
  { username: "unit-ops", password: "UnitOps#2026pass", role: "operations", displayName: "单测运营" },
]);

const { closeDb } = await import("./db");
const { verifyStaffLogin, upsertPositions, detectPositionChanges, recordPositionChanges, listPositionChangesFor } = await import("./admin");

afterAll(() => { closeDb(); rmSync(dir, { recursive: true, force: true }); });

const base = {
  id: "job-change-1",
  name: "变更测试岗",
  department: "测试局",
  region: "广州市",
  unitLevel: "市级",
  minEducation: "本科",
  majorCategories: ["计算机类"],
  recruiting: 2,
  sourceName: "测试来源",
  sourceFile: "changes.csv",
  sourceUpdatedAt: "2026-08-20",
};

describe("职位变更检测（F0275）", () => {
  it("首次导入无变更；招录数与来源时间变化被逐字段记录", () => {
    const login = verifyStaffLogin("unit-ops", "UnitOps#2026pass");
    if (!login.ok) throw new Error("login failed");

    expect(detectPositionChanges([base])).toEqual([]);
    upsertPositions([base], login.staff);

    const changes = detectPositionChanges([{ ...base, recruiting: 5, sourceUpdatedAt: "2026-08-28" }]);
    expect([...changes.map((c) => c.field)].sort()).toEqual(["招录人数", "来源更新时间"]);
    expect(changes.find((c) => c.field === "招录人数")).toMatchObject({ before: "2", after: "5" });

    recordPositionChanges(changes);
    expect(listPositionChangesFor(["job-change-1"]).length).toBe(2);
  });

  it("只返回指定收藏职位的变更，未收藏的不外泄", () => {
    expect(listPositionChangesFor([])).toEqual([]);
    expect(listPositionChangesFor(["job-not-favorited"])).toEqual([]);
  });
});
