import { NextResponse } from "next/server";
import { authStaff, detectPositionChanges, recordPositionChanges, recordPositionImportRun, upsertPositions } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { mapAndValidatePositions, parsePositionFile, suggestMapping, type PositionMapping } from "@/lib/jobs/position-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** F0352：服务端重新解析、全量校验后才提交；存在任何坏行则零写入。 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "config:write");
  if (!auth.staff) return NextResponse.json({ ok: false, message: "无职位导入权限" }, { status: auth.forbidden ? 403 : 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "缺少职位表文件" }, { status: 400 });
    const table = await parsePositionFile(new Uint8Array(await file.arrayBuffer()), file.name);
    const proposed = suggestMapping(table.headers);
    const rawMapping = form.get("mapping");
    const parsedMapping = rawMapping ? JSON.parse(String(rawMapping)) as PositionMapping : {};
    const mapping = Object.keys(parsedMapping).length > 0 ? parsedMapping : proposed;
    const sourceName = String(form.get("sourceName") ?? "").trim();
    const sourceUpdatedAt = String(form.get("sourceUpdatedAt") ?? "").trim();
    const result = mapAndValidatePositions(table, mapping, { sourceName: sourceName || undefined, sourceFile: file.name, sourceUpdatedAt: sourceUpdatedAt || undefined });
    if (result.errors.length > 0 || result.positions.length !== table.rows.length) {
      recordPositionImportRun({ status: "rejected", sourceName, sourceFile: file.name, sourceUpdatedAt, format: table.format, sheetName: table.sheetName, mapping, totalRows: table.rows.length, importedRows: 0, errors: result.errors, staff: auth.staff });
      return NextResponse.json({ ok: false, message: "校验失败，未写入任何职位", errors: result.errors }, { status: 422 });
    }
    // 校验已先完成；写职位、审计、成功导入记录在同一 SQLite 事务中。
    // 任何写入异常或二次校验失败都会回滚，绝不留下半批职位。
    const db = getDb();
    let inserted: { inserted: number; problems: string[] } | null = null;
    try {
      db.exec("BEGIN IMMEDIATE");
      // F0275：先在同一事务内取差异，再写入，保证变更记录与职位数据一致。
      const changes = detectPositionChanges(result.positions);
      inserted = upsertPositions(result.positions, auth.staff);
      recordPositionChanges(changes);
      if (inserted.problems.length > 0 || inserted.inserted !== result.positions.length) {
        throw new Error("POSITION_WRITE_VALIDATION_FAILED");
      }
      recordPositionImportRun({ status: "success", sourceName, sourceFile: file.name, sourceUpdatedAt, format: table.format, sheetName: table.sheetName, mapping, totalRows: table.rows.length, importedRows: inserted.inserted, errors: [], staff: auth.staff });
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch { /* no transaction remained */ }
      const problems = inserted?.problems ?? [error instanceof Error ? error.message : "职位写入异常"];
      recordPositionImportRun({ status: "rejected", sourceName, sourceFile: file.name, sourceUpdatedAt, format: table.format, sheetName: table.sheetName, mapping, totalRows: table.rows.length, importedRows: 0, errors: problems, staff: auth.staff });
      return NextResponse.json({ ok: false, message: "职位写入失败，已完整回滚", errors: problems }, { status: 422 });
    }
    return NextResponse.json({ ok: true, imported: inserted!.inserted, message: `导入成功 ${inserted!.inserted} 条` });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "文件导入失败" }, { status: 400 });
  }
}
