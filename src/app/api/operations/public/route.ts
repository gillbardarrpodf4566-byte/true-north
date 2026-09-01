import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Notice {
  id: string;
  title: string;
  body: string;
  status: string;
}

interface Template {
  id: string;
  kind: string;
  template: string;
}

/**
 * GET /api/operations/public — F0356 已发布运营位 + F0357 消息模板（面向用户端）。
 * 只下发「已发布」公告；草稿不外泄。
 */
export async function GET(): Promise<NextResponse> {
  const notices = ((getAiConfig("notices") as Notice[] | null) ?? []).filter((item) => item.status === "已发布");
  const templates = (getAiConfig("message_templates") as Template[] | null) ?? [];
  return NextResponse.json({ ok: true, notices, templates });
}
