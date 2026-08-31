import { NextResponse } from "next/server";
import { matchPositions, SEED_POSITIONS } from "@/lib/jobs/engine";
import type { EducationLevel, JobPosition, PoliticalStatus } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/jobs/match — 确定性资格筛选 + 软排序（F0259/F0262/F0263/F0264）。
 * 职位库服务端真源在 SQLite（后台导入）；为空时回退种子职位。
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: {
    education?: string;
    major?: string;
    isFreshGraduate?: boolean;
    politicalStatus?: string;
    grassrootsYears?: number;
    region?: string;
    targetScore?: number | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const profile = {
    education: (body.education ?? "本科") as EducationLevel,
    major: (body.major ?? "").trim(),
    isFreshGraduate: body.isFreshGraduate === true,
    politicalStatus: (body.politicalStatus ?? "群众") as PoliticalStatus,
    grassrootsYears: Number(body.grassrootsYears) || 0,
    preferences: { region: body.region },
    updatedAt: new Date().toISOString(),
  };
  if (profile.major === "") {
    return NextResponse.json({ ok: false, message: "请先填写专业（F0257 资格建档）" }, { status: 400 });
  }

  const dbPositions = await import("@/lib/server/admin")
    .then((m) =>
      m.listPositions().map(
        (r): JobPosition => ({
          id: r.qid,
          name: r.name,
          department: r.department,
          region: r.region,
          unitLevel: r.unit_level,
          recruiting: r.recruiting,
          minEducation: r.min_education as EducationLevel,
          majorCategories: JSON.parse(r.major_categories) as string[],
          politicalRequirement: r.political_requirement as PoliticalStatus,
          requiresGrassroots: r.requires_grassroots === 1,
          freshOnly: r.fresh_only === 1,
          history: JSON.parse(r.history) as JobPosition["history"],
          source: { name: r.source_name, file: r.source_file, updatedAt: r.source_updated_at },
        }),
      ),
    )
    .catch(() => []);

  const positions = dbPositions.length > 0 ? dbPositions : SEED_POSITIONS;
  const matches = matchPositions(positions, profile, { targetScore: body.targetScore ?? null });
  return NextResponse.json({
    ok: true,
    matches: matches.map((m) => ({
      position: m.position,
      verdict: m.verdict,
      checks: m.checks,
      tier: m.tier,
      reasons: m.reasons,
      competitionRatio: m.competitionRatio,
      dataStale: m.dataStale,
    })),
  });
}
