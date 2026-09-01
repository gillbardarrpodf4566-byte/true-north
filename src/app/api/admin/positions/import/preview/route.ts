import { NextResponse } from "next/server";
import { authStaff } from "@/lib/server/admin";
import { mapAndValidatePositions, parsePositionFile, suggestMapping, type PositionMapping } from "@/lib/jobs/position-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** F0352：只解析和校验，不写职位库。 */
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
    // 空对象代表调用方尚未选择映射，应采用服务器的别名建议，而不是把所有列当作未映射。
    const mapping = Object.keys(parsedMapping).length > 0 ? parsedMapping : proposed;
    const result = mapAndValidatePositions(table, mapping, {
      sourceName: String(form.get("sourceName") ?? "").trim() || undefined,
      sourceFile: file.name,
      sourceUpdatedAt: String(form.get("sourceUpdatedAt") ?? "").trim() || undefined,
    });
    return NextResponse.json({ ok: true, format: table.format, sheetName: table.sheetName, headers: table.headers, proposedMapping: proposed, mapping, sample: result.positions.slice(0, 5), validRows: result.positions.length, totalRows: table.rows.length, errors: result.errors });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "文件解析失败" }, { status: 400 });
  }
}
