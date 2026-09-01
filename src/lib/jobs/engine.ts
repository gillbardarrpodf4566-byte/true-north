/**
 * 职位库种子 + 确定性资格规则引擎（F0352/F0353/F0359 的服务端数据在 SQLite，
 * 此模块为纯函数引擎 + 默认规则）。
 */

import {
  EDUCATION_ORDER,
  POLITICAL_ORDER,
  type JobMatch,
  type JobPosition,
  type JobSeekerProfile,
  type RequirementCheck,
} from "./types";
import { DEFAULT_RULE_SET, type QualificationRuleSet } from "./rules";

/** F0353 资格规则配置（服务端可覆盖）：专业大类同义映射 */
export const DEFAULT_MAJOR_SYNONYMS: Record<string, string[]> = {
  计算机类: ["计算机科学与技术", "软件工程", "信息安全", "数据科学与大数据技术"],
  法学类: ["法学", "法律硕士", "知识产权"],
  经济学类: ["经济学", "金融学", "财政学", "国际经济与贸易"],
  中国语言文学类: ["汉语言文学", "新闻学", "网络与新媒体"],
  管理类: ["行政管理", "工商管理", "人力资源管理", "公共事业管理"],
  统计学类: ["统计学", "应用统计学", "数据科学与大数据技术"],
  不限: [],
};

/** 职位库种子（模拟数据，含来源与更新时间 F0354/F0270） */
export const SEED_POSITIONS: JobPosition[] = [
  {
    id: "job-001",
    name: "市税务局一级行政执法员",
    department: "市税务局",
    region: "广州市",
    unitLevel: "市级",
    recruiting: 2,
    minEducation: "本科",
    majorCategories: ["经济学类", "计算机类"],
    politicalRequirement: "中共党员",
    requiresGrassroots: false,
    freshOnly: false,
    history: [
      { year: 2024, recruited: 2, interviewScore: 131.2, applicants: 96 },
      { year: 2025, recruited: 3, interviewScore: 128.6, applicants: 118 },
    ],
    source: { name: "2026 国考职位表（官方）·演示数据", file: "2026-gk-positions.xlsx", updatedAt: "2026-08-15", origin: "simulated" },
  },
  {
    id: "job-002",
    name: "区统计局统计分析岗",
    department: "区统计局",
    region: "佛山市",
    unitLevel: "区县级",
    recruiting: 1,
    minEducation: "本科",
    majorCategories: ["统计学类", "经济学类"],
    politicalRequirement: "群众",
    requiresGrassroots: false,
    freshOnly: true,
    history: [
      { year: 2024, recruited: 1, interviewScore: 124.5, applicants: 61 },
      { year: 2025, recruited: 1, interviewScore: 126.8, applicants: 74 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20", origin: "simulated" },
  },
  {
    id: "job-003",
    name: "街道办综合管理岗",
    department: "某街道办事处",
    region: "广州市",
    unitLevel: "乡镇街道",
    recruiting: 3,
    minEducation: "本科",
    majorCategories: ["不限"],
    politicalRequirement: "群众",
    requiresGrassroots: true,
    freshOnly: false,
    history: [
      { year: 2024, recruited: 3, interviewScore: 118.9, applicants: 142 },
      { year: 2025, recruited: 2, interviewScore: 121.4, applicants: 158 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2026-08-20", origin: "simulated" },
  },
  {
    id: "job-004",
    name: "市委办公室文秘岗",
    department: "市委办公室",
    region: "武汉市",
    unitLevel: "市级",
    recruiting: 1,
    minEducation: "硕士",
    majorCategories: ["中国语言文学类", "法学类"],
    politicalRequirement: "中共党员",
    requiresGrassroots: true,
    freshOnly: false,
    history: [
      { year: 2025, recruited: 1, interviewScore: 138.2, applicants: 203 },
    ],
    source: { name: "2026 选调职位表（官方）·演示数据", file: "2026-xd-positions.xlsx", updatedAt: "2026-08-25", origin: "simulated" },
  },
  {
    id: "job-005",
    name: "县市场监管局执法岗",
    department: "县市场监管局",
    region: "韶关市",
    unitLevel: "乡镇街道",
    recruiting: 4,
    minEducation: "大专",
    majorCategories: ["不限"],
    politicalRequirement: "群众",
    requiresGrassroots: false,
    freshOnly: false,
    history: [
      { year: 2024, recruited: 4, interviewScore: 108.3, applicants: 88 },
      { year: 2025, recruited: 5, interviewScore: 110.1, applicants: 95 },
    ],
    source: { name: "2026 省考职位表（官方）·演示数据", file: "2026-sk-positions.xlsx", updatedAt: "2025-12-30", origin: "simulated" },
  },
  {
    id: "job-006",
    name: "市大数据管理局信息岗",
    department: "市大数据管理局",
    region: "深圳市",
    unitLevel: "市级",
    recruiting: 2,
    minEducation: "本科",
    majorCategories: ["计算机类", "统计学类"],
    politicalRequirement: "共青团员",
    requiresGrassroots: false,
    freshOnly: false,
    history: [
      { year: 2024, recruited: 2, interviewScore: 134.7, applicants: 187 },
      { year: 2025, recruited: 2, interviewScore: 136.1, applicants: 210 },
    ],
    source: { name: "2026 市考职位表（官方）·演示数据", file: "2026-ds-positions.xlsx", updatedAt: "2026-08-28", origin: "simulated" },
  },
];

// ---------- 确定性资格引擎（F0259/F0260/F0261） ----------

function majorMatches(major: string, categories: string[], synonyms: Record<string, string[]>): {
  pass: boolean;
  needsConfirm: boolean;
  reason?: string;
} {
  if (categories.includes("不限")) return { pass: true, needsConfirm: false };
  const direct = categories.some((c) => c === major);
  if (direct) return { pass: true, needsConfirm: false };
  // 同义映射：用户专业是否属于某要求大类的同义词表
  const synonymHit = categories.filter((c) => (synonyms[c] ?? []).includes(major));
  if (synonymHit.length > 0) {
    // 同义匹配意味着「名称不同但属同一目录大类」——确定性可判，但建议报名前人工复核
    return { pass: true, needsConfirm: true, reason: `专业同义匹配：${major} 通常属于「${synonymHit[0]}」，请对照官方专业目录确认。` };
  }
  return {
    pass: false,
    needsConfirm: false,
    reason: `专业不符：要求 ${categories.join("/")}，你的专业是「${major}」`,
  };
}

export function checkRequirements(
  p: JobPosition,
  profile: JobSeekerProfile,
  synonyms: Record<string, string[]> = DEFAULT_MAJOR_SYNONYMS,
  rules: QualificationRuleSet = DEFAULT_RULE_SET,
): RequirementCheck[] {
  const checks: RequirementCheck[] = [];
  const educationOrder = Object.fromEntries(rules.educationOrder.map((level, index) => [level, index + 1])) as Record<string, number>;
  const politicalOrder = Object.fromEntries(rules.politicalOrder.map((status, index) => [status, index + 1])) as Record<string, number>;
  const eduPass = (educationOrder[profile.education] ?? EDUCATION_ORDER[profile.education]) >= (educationOrder[p.minEducation] ?? EDUCATION_ORDER[p.minEducation]);
  checks.push({
    field: "学历",
    pass: eduPass,
    reason: eduPass ? undefined : `要求 ${p.minEducation} 及以上，你是 ${profile.education}`,
  });

  const major = majorMatches(profile.major, p.majorCategories, synonyms);
  checks.push({
    field: "专业",
    pass: major.pass,
    needsConfirm: major.needsConfirm,
    reason: major.reason ?? (major.needsConfirm ? "专业按目录同义匹配，报名前请对照官方目录复核" : undefined),
  });

  const polPass = (politicalOrder[profile.politicalStatus] ?? POLITICAL_ORDER[profile.politicalStatus]) >= (politicalOrder[p.politicalRequirement] ?? POLITICAL_ORDER[p.politicalRequirement]);
  checks.push({
    field: "政治面貌",
    pass: polPass,
    reason: polPass ? undefined : `要求 ${p.politicalRequirement}，你是 ${profile.politicalStatus}`,
  });

  const grassPass = !p.requiresGrassroots || profile.grassrootsYears >= rules.grassrootsYearsWhenRequired;
  checks.push({
    field: "基层经历",
    pass: grassPass,
    reason: grassPass ? undefined : `要求 ${rules.grassrootsYearsWhenRequired} 年以上基层工作经历，你登记 ${profile.grassrootsYears} 年`,
  });

  const freshPass = !p.freshOnly || profile.isFreshGraduate;
  checks.push({
    field: "应届",
    pass: freshPass,
    reason: freshPass ? undefined : "仅限应届毕业生报考",
  });

  return checks;
}

/** 当前预估分（冲稳保基准）：MVP 用目标分×0.85；接入预测后替换为 score forecast */
function estimateScore(profile: JobSeekerProfile, targetScore: number | null): number {
  return targetScore != null ? targetScore : 125;
}

/** 资格筛选 + 软排序（F0259/F0262/F0263/F0264/F0265/F0270） */
export function matchPositions(
  positions: JobPosition[],
  profile: JobSeekerProfile,
  opts: { targetScore?: number | null; synonyms?: Record<string, string[]>; rules?: QualificationRuleSet; ruleRevision?: number } = {},
): JobMatch[] {
  const target = estimateScore(profile, opts.targetScore ?? null);
  const rules = opts.rules ?? DEFAULT_RULE_SET;
  const synonyms = opts.synonyms ?? rules.majorSynonyms;

  const matches: JobMatch[] = positions.map((p) => {
    const checks = checkRequirements(p, profile, synonyms, rules);
    const hardFail = checks.some((c) => !c.pass);
    // 同义匹配（needsConfirm）不算不确定结论：判定仍为可报，仅在 UI 提示人工复核
    const verdict: JobMatch["verdict"] = hardFail ? "不可报" : "可报";

    const latest = p.history[p.history.length - 1];
    const competitionRatio =
      latest?.applicants != null && p.recruiting > 0
        ? Math.round((latest.applicants / p.recruiting) * 10) / 10
        : null;
    const ageDays = (Date.now() - new Date(p.source.updatedAt).getTime()) / 86_400_000;
    const dataStale = ageDays > 365;

    const reasons: string[] = [];
    const unavailableFactors: string[] = [];
    let preferenceScore = 0;
    let tier: JobMatch["tier"] | undefined;
    if (verdict !== "不可报" && latest) {
      if (competitionRatio != null && competitionRatio <= 40) {
        reasons.push(`竞争相对温和（约 ${competitionRatio}:1，来源 ${p.source.name}）`);
      }
      if (latest.interviewScore != null) {
        const diff = Math.round((target - latest.interviewScore) * 10) / 10;
        // 目标分高于历史线代表更有把握：高于线为保，接近为稳，低于线为冲。
        tier = diff <= -5 ? "冲" : diff <= 3 ? "稳" : "保";
        reasons.push(
          `去年进面分 ${latest.interviewScore}，与你预估 ${target} 相差 ${diff > 0 ? "+" : ""}${diff} 分`,
        );
      }
      if (profile.preferences.region) {
        if (profile.preferences.region === p.region) {
          preferenceScore += 3;
          reasons.push(`符合你的地区偏好（${p.region}）`);
        } else if (profile.preferences.commute === "同区优先") {
          preferenceScore -= 2;
          reasons.push(`不在首选地区（${profile.preferences.region}），通勤偏好为同区优先`);
        }
      }
      if (profile.preferences.unitLevel) {
        if (profile.preferences.unitLevel === p.unitLevel) {
          preferenceScore += 2;
          reasons.push(`符合你的单位层级偏好（${p.unitLevel}）`);
        } else {
          reasons.push(`单位层级为${p.unitLevel}，与你偏好的${profile.preferences.unitLevel}不同`);
        }
      }
      if (profile.preferences.commute) {
        // 职位表只有地区，没有来源支持的路线/通勤时长；不猜测，明确未计分。
        unavailableFactors.push("通勤距离（职位表未提供可验证路线数据）");
      }
      if (profile.preferences.developmentPriorities?.length) {
        unavailableFactors.push("发展偏好（职位表未提供官方发展标签）");
      }
      if (dataStale) {
        reasons.push(`注意：职位数据更新于 ${p.source.updatedAt}，已超过一年，报名前请核对最新公告`);
      }
      if (profile.preferences.riskAppetite === "稳妥" && tier === "保") preferenceScore += 1;
      if (profile.preferences.riskAppetite === "冲刺" && tier === "冲") preferenceScore += 1;
      if (unavailableFactors.length > 0) reasons.push(`未计入排序：${unavailableFactors.join("、")}`);
      if (reasons.length === 0) reasons.push("资格符合，暂无更多参考数据。");
    }

    return {
      position: p,
      verdict,
      checks,
      tier,
      reasons,
      competitionRatio,
      dataStale,
      preferenceScore,
      unavailableFactors,
      ruleRevision: opts.ruleRevision,
    };
  });

  // 软排序：可报优先，组内按 竞争比低 → 进面分低 优先（AI 只做解释与软排序）
  const tierRank = { 稳: 0, 保: 1, 冲: 2, undefined: 3 } as Record<string, number>;
  matches.sort((a, b) => {
    if (a.verdict !== b.verdict) {
      const order = { 可报: 0, 待人工确认: 1, 不可报: 2 };
      return order[a.verdict] - order[b.verdict];
    }
    if (a.verdict === "可报") {
      const ta = tierRank[String(a.tier)] ?? 3;
      const tb = tierRank[String(b.tier)] ?? 3;
      if (ta !== tb) return ta - tb;
      if ((b.preferenceScore ?? 0) !== (a.preferenceScore ?? 0)) return (b.preferenceScore ?? 0) - (a.preferenceScore ?? 0);
    }
    const ca = a.competitionRatio ?? Number.MAX_SAFE_INTEGER;
    const cb = b.competitionRatio ?? Number.MAX_SAFE_INTEGER;
    return ca - cb;
  });

  return matches;
}

/** 易上岸候选（F0263）：可报 + 竞争最低的前 N */
export function easyCandidates(matches: JobMatch[], n = 3): JobMatch[] {
  return matches
    .filter((m) => m.verdict === "可报" && m.competitionRatio != null)
    .sort((a, b) => (a.competitionRatio ?? 0) - (b.competitionRatio ?? 0))
    .slice(0, n);
}
