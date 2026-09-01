import { NextResponse } from "next/server";
import { authStaff, listPositionImportRuns } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = authStaff(req, "config:read");
  if (!auth.staff) return NextResponse.json({ ok: false, message: "无权限" }, { status: auth.forbidden ? 403 : 401 });
  return NextResponse.json({ ok: true, runs: listPositionImportRuns() });
}
