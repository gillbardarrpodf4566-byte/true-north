import ExcelJS from "exceljs";

export const POSITION_FIELDS = [
  "id", "name", "department", "region", "unitLevel", "recruiting", "minEducation",
  "majorCategories", "politicalRequirement", "requiresGrassroots", "freshOnly", "history",
  "sourceName", "sourceFile", "sourceUpdatedAt",
] as const;
export type PositionField = (typeof POSITION_FIELDS)[number];

const ALIASES: Record<PositionField, string[]> = {
  id: ["id", "职位代码", "岗位代码", "职位编号"],
  name: ["name", "职位名称", "岗位名称"],
  department: ["department", "招录机关", "用人单位", "单位"],
  region: ["region", "工作地点", "地区", "机构层级地区"],
  unitLevel: ["unitLevel", "机构层级", "单位层级"],
  recruiting: ["recruiting", "招录人数", "计划人数", "人数"],
  minEducation: ["minEducation", "学历", "最低学历"],
  majorCategories: ["majorCategories", "专业", "专业类别", "专业要求"],
  politicalRequirement: ["politicalRequirement", "政治面貌", "政治要求"],
  requiresGrassroots: ["requiresGrassroots", "基层工作经历", "基层经历"],
  freshOnly: ["freshOnly", "应届生", "仅限应届"],
  history: ["history", "历史数据", "历年数据"],
  sourceName: ["sourceName", "来源", "来源名称", "数据来源"],
  sourceFile: ["sourceFile", "来源文件", "文件名"],
  sourceUpdatedAt: ["sourceUpdatedAt", "更新时间", "来源更新时间", "更新日期"],
};

export interface ParsedPositionTable {
  format: "csv" | "xlsx" | "json";
  sheetName: string | null;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export interface PositionMapping {
  [field: string]: string | undefined;
}

export interface PositionImportResult {
  mapping: PositionMapping;
  rows: Array<Record<string, unknown>>;
  positions: Array<Record<string, unknown>>;
  errors: Array<{ row: number; field?: string; message: string }>;
}

export function parseCsv(text: string): ParsedPositionTable {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); records.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell.trim()); records.push(row); }
  const headers = (records.shift() ?? []).map((header) => header.trim());
  const rows = records.filter((values) => values.some((value) => value !== "")).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  return { format: "csv", sheetName: null, headers, rows };
}

export async function parsePositionFile(buffer: Uint8Array, fileName: string): Promise<ParsedPositionTable> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(new TextDecoder("utf-8").decode(buffer));
  if (lower.endsWith(".json")) {
    const value = JSON.parse(new TextDecoder("utf-8").decode(buffer)) as unknown;
    const rows = Array.isArray(value) ? value : (value as { rows?: unknown[] })?.rows;
    if (!Array.isArray(rows)) throw new Error("JSON 必须是数组或 { rows: [] }。");
    const objects = rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row)));
    return { format: "json", sheetName: null, headers: [...new Set(objects.flatMap((row) => Object.keys(row)))], rows: objects };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("工作簿没有可读取的工作表。");
    const values = sheet.getSheetValues().slice(1) as Array<unknown[]>;
    const headers = (values.shift() ?? []).slice(1).map((value) => String(value ?? "").trim());
    const rows = values.filter((values) => values.some((value) => value != null && String(value).trim() !== "")).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index + 1] ?? ""])));
    return { format: "xlsx", sheetName: sheet.name, headers, rows };
  }
  throw new Error("仅支持 CSV、XLSX、XLSM 或 JSON。");
}

export function suggestMapping(headers: string[]): PositionMapping {
  const normalized = new Map(headers.map((header) => [normalize(header), header]));
  return Object.fromEntries(POSITION_FIELDS.flatMap((field) => {
    const header = ALIASES[field].map(normalize).map((alias) => normalized.get(alias)).find(Boolean);
    return header ? [[field, header]] : [];
  }));
}

export function mapAndValidatePositions(
  table: ParsedPositionTable,
  mapping: PositionMapping,
  metadata: { sourceName?: string; sourceFile: string; sourceUpdatedAt?: string },
): PositionImportResult {
  const errors: PositionImportResult["errors"] = [];
  const positions: Array<Record<string, unknown>> = [];
  for (const [index, row] of table.rows.entries()) {
    const line = index + 2;
    const canonical: Record<string, unknown> = {};
    for (const field of POSITION_FIELDS) {
      const source = mapping[field];
      let value = source ? row[source] : undefined;
      if ((value == null || String(value).trim() === "") && field === "sourceName") value = metadata.sourceName;
      if ((value == null || String(value).trim() === "") && field === "sourceFile") value = metadata.sourceFile;
      if ((value == null || String(value).trim() === "") && field === "sourceUpdatedAt") value = metadata.sourceUpdatedAt;
      canonical[field] = normalizeValue(field, value);
    }
    const required: PositionField[] = ["id", "name", "department", "region", "unitLevel", "recruiting", "minEducation", "majorCategories", "sourceName", "sourceFile", "sourceUpdatedAt"];
    for (const field of required) if (isEmpty(canonical[field])) errors.push({ row: line, field, message: "必填字段缺失" });
    if (!Number.isInteger(canonical.recruiting) || Number(canonical.recruiting) <= 0) errors.push({ row: line, field: "recruiting", message: "必须是正整数" });
    if (typeof canonical.sourceUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(canonical.sourceUpdatedAt)) errors.push({ row: line, field: "sourceUpdatedAt", message: "必须是 YYYY-MM-DD" });
    else if (canonical.sourceUpdatedAt > new Date().toISOString().slice(0, 10)) errors.push({ row: line, field: "sourceUpdatedAt", message: "来源更新时间不能晚于今天" });
    if (canonical.majorCategories === undefined || (canonical.majorCategories as string[]).length === 0) errors.push({ row: line, field: "majorCategories", message: "专业类别不能为空" });
    if (!errors.some((error) => error.row === line)) positions.push(canonical);
  }
  return { mapping, rows: table.rows, positions, errors };
}

function normalize(field: string): string { return field.trim().toLowerCase().replace(/[\s_\-（）()]/g, ""); }
function isEmpty(value: unknown): boolean { return value == null || String(value).trim() === "" || (Array.isArray(value) && value.length === 0); }
function normalizeValue(field: PositionField, value: unknown): unknown {
  if (value == null) return undefined;
  if (field === "recruiting") return Number(String(value).replace(/,/g, "").trim());
  if (field === "majorCategories") return Array.isArray(value) ? value.map(String).filter(Boolean) : String(value).split(/[、,，;；|]/).map((item) => item.trim()).filter(Boolean);
  if (field === "requiresGrassroots" || field === "freshOnly") return [true, "true", "是", "1", 1].includes(value as never);
  if (field === "history") {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(String(value)); } catch { return []; }
  }
  return String(value).trim();
}
