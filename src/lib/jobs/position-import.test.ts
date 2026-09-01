import { describe, expect, it } from "vitest";
import { mapAndValidatePositions, parseCsv, suggestMapping } from "./position-import";

const CSV = `职位代码,职位名称,招录机关,工作地点,机构层级,招录人数,最低学历,专业要求,数据来源,更新日期
A001,测试数据岗,测试局,广州市,市级,2,本科,"计算机类、统计学类",2026 国考职位表,2026-08-31
`;

describe("职位表字段映射（F0352）", () => {
  it("自动识别常见中文表头并映射为规范职位字段", () => {
    const table = parseCsv(CSV);
    const mapping = suggestMapping(table.headers);
    expect(mapping).toMatchObject({ id: "职位代码", name: "职位名称", department: "招录机关", region: "工作地点", recruiting: "招录人数", minEducation: "最低学历", majorCategories: "专业要求" });
    const result = mapAndValidatePositions(table, mapping, { sourceFile: "positions.csv" });
    expect(result.errors).toEqual([]);
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0]).toMatchObject({ id: "A001", majorCategories: ["计算机类", "统计学类"], sourceFile: "positions.csv", sourceUpdatedAt: "2026-08-31" });
  });

  it("拒绝晚于今天的来源更新时间，避免把旧数据标成最新公告", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const table = parseCsv(`职位代码,职位名称,招录机关,工作地点,机构层级,招录人数,最低学历,专业要求,数据来源,更新日期\nC001,未来岗,测试局,广州市,市级,1,本科,计算机类,测试来源,${future}\n`);
    const result = mapAndValidatePositions(table, suggestMapping(table.headers), { sourceFile: "future.csv" });
    expect(result.positions).toHaveLength(0);
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: "sourceUpdatedAt", message: "来源更新时间不能晚于今天" })]));
  });

  it("缺少来源新鲜度时逐行报错，且不返回可提交职位", () => {
    const table = parseCsv(`职位代码,职位名称,招录机关,工作地点,机构层级,招录人数,最低学历,专业要求\nA001,测试数据岗,测试局,广州市,市级,2,本科,计算机类\n`);
    const result = mapAndValidatePositions(table, suggestMapping(table.headers), { sourceFile: "bad.csv" });
    expect(result.positions).toHaveLength(0);
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: "sourceName" }), expect.objectContaining({ field: "sourceUpdatedAt" })]));
  });

  it("显式映射优先于自动建议，支持异构第三方列名", () => {
    const table = parseCsv(`编号,岗位,机关,地区,级别,人数,学历,专业,来源,日期\nB001,分析岗,统计局,佛山市,区县级,1,本科,统计学类,省考,2026-08-30\n`);
    const mapping = { id: "编号", name: "岗位", department: "机关", region: "地区", unitLevel: "级别", recruiting: "人数", minEducation: "学历", majorCategories: "专业", sourceName: "来源", sourceUpdatedAt: "日期" };
    const result = mapAndValidatePositions(table, mapping, { sourceFile: "heterogeneous.csv" });
    expect(result.errors).toEqual([]);
    expect(result.positions[0]).toMatchObject({ id: "B001", name: "分析岗", sourceFile: "heterogeneous.csv" });
  });
});
