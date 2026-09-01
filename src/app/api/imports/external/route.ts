import { NextResponse } from "next/server";
import { userFromToken } from "@/lib/server/db";
import { claimExternalImport, type ExternalImportKind } from "@/lib/server/external-imports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authenticated external-data import ledger (F0039/F0042/F0043/F0048/F0049).
 * Server computes the semantic SHA-256 independently; repeated payloads return already_imported.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  if (!user) return NextResponse.json({ ok: false, message: "登录后才能同步外部导入记录。" }, { status: 401 });
  let body: { kind?: ExternalImportKind; sourceLabel?: string; parserVersion?: string; records?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 }); }
  if (!body.kind || !["history", "practice", "wrong"].includes(body.kind) || !Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json({ ok: false, message: "导入类型或记录格式无效。" }, { status: 400 });
  }
  const claim = claimExternalImport({
    userId: user.id,
    kind: body.kind,
    sourceLabel: body.sourceLabel ?? "外部导入",
    parserVersion: body.parserVersion ?? "external-v1",
    records: body.records,
  });
  return NextResponse.json({ ok: true, ...claim });
}
