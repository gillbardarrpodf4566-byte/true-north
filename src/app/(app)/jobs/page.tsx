"use client";

/**
 * 智能选岗（V1 / CL-08，屏 §11.14）。
 * F0257/F0258 资格与偏好建档 → F0259/0260 确定性筛选与逐条原因 →
 * F0262–F0265 冲稳保/易上岸/理由 → F0266–F0270 历年与数据新鲜度 →
 * F0271 对比（3–5 个）/ F0273 收藏 / F0274 报名节点提醒。
 * 职位不是商品卡：dense professional list + expandable evidence（§11.14）。
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { useProfileStore } from "@/lib/profile/store";
import type { EducationLevel, JobMatch, PoliticalStatus } from "@/lib/jobs/types";

interface MatchDTO {
  position: JobMatch["position"];
  verdict: JobMatch["verdict"];
  checks: JobMatch["checks"];
  tier?: JobMatch["tier"];
  reasons: string[];
  competitionRatio: number | null;
  dataStale: boolean;
}

const EDU: EducationLevel[] = ["大专", "本科", "硕士", "博士"];
const POL: PoliticalStatus[] = ["群众", "共青团员", "中共党员"];

export default function JobsPage() {
  const { jobProfile, setJobProfile, jobFavorites, toggleJobFavorite } = useProfileStore();
  const [education, setEducation] = useState<EducationLevel>(jobProfile?.education ?? "本科");
  const [major, setMajor] = useState(jobProfile?.major ?? "");
  const [fresh, setFresh] = useState(jobProfile?.isFreshGraduate ?? false);
  const [political, setPolitical] = useState<PoliticalStatus>(jobProfile?.politicalStatus ?? "群众");
  const [years, setYears] = useState(String(jobProfile?.grassrootsYears ?? 0));
  const [region, setRegion] = useState(jobProfile?.preferences.region ?? "");
  const [matches, setMatches] = useState<MatchDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);

  const ready = major.trim() !== "";
  const reportable = useMemo(() => (matches ?? []).filter((m) => m.verdict === "可报"), [matches]);

  const runMatch = async (): Promise<void> => {
    setError(null);
    const res = await fetch("/api/jobs/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        education,
        major: major.trim(),
        isFreshGraduate: fresh,
        politicalStatus: political,
        grassrootsYears: Number(years) || 0,
        region: region || undefined,
      }),
    });
    const data = (await res.json()) as { ok: boolean; matches?: MatchDTO[]; message?: string };
    if (!data.ok) {
      setError(data.message ?? "匹配失败");
      setMatches(null);
      return;
    }
    setJobProfile({
      education,
      major: major.trim(),
      isFreshGraduate: fresh,
      politicalStatus: political,
      grassrootsYears: Number(years) || 0,
      preferences: { region: region || undefined },
      updatedAt: new Date().toISOString(),
    });
    setMatches(data.matches ?? []);
  };

  // F0274/F0291 报名节点（公开只读接口）
  const [nodes, setNodes] = useState<Array<{ id: number; exam_name: string; kind: string; date: string }>>([]);
  useEffect(() => {
    void fetch("/api/admin/exam-nodes")
      .then((r) => r.json())
      .then((d: { ok: boolean; rows?: typeof nodes }) => {
        if (d.ok) setNodes(d.rows ?? []);
      })
      .catch(() => undefined);
  }, []);

  const toggleCompare = (id: string): void => {
    setCompare((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : c.length >= 5 ? c : [...c, id],
    );
  };

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">智能选岗</h1>
      <p className="mt-xs text-body-sm text-muted">
        资格判断用确定性规则，逐条给出可报/不可报原因；推荐只做参考排序，报名前以官方公告为准。
      </p>

      {/* F0257/F0258 建档（CL-08 step1） */}
      <Card className="mt-lg">
        <p className="text-label-md text-muted">我的资格条件</p>
        <div className="mt-md space-y-md">
          <label className="block">
            <span className="text-caption text-muted">专业（按毕业证/目录名称）</span>
            <input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              aria-label="专业"
              placeholder="如 计算机科学与技术"
              className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
            />
          </label>
          <div className="grid grid-cols-2 gap-md">
            <label className="block">
              <span className="text-caption text-muted">学历</span>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value as EducationLevel)}
                aria-label="学历"
                className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              >
                {EDU.map((e2) => (
                  <option key={e2}>{e2}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-caption text-muted">政治面貌</span>
              <select
                value={political}
                onChange={(e) => setPolitical(e.target.value as PoliticalStatus)}
                aria-label="政治面貌"
                className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              >
                {POL.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-caption text-muted">基层工作年限</span>
              <input
                value={years}
                onChange={(e) => setYears(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                aria-label="基层工作年限"
                className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              />
            </label>
            <label className="block">
              <span className="text-caption text-muted">意向地区（可选）</span>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label="意向地区"
                placeholder="如 广州市"
                className="mt-xxs h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              />
            </label>
          </div>
          <label className="flex items-center gap-sm text-body-sm text-body">
            <input
              type="checkbox"
              checked={fresh}
              onChange={(e) => setFresh(e.target.checked)}
              className="h-4 w-4 accent-[var(--ja-color-primary)]"
            />
            我是应届毕业生
          </label>
          <Button fullWidth onClick={() => void runMatch()} disabled={!ready}>
            {matches ? "重新匹配" : "开始匹配"}
          </Button>
          {error ? (
            <p role="alert" className="text-caption text-error">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {/* F0274 报名节点 */}
      {nodes.length > 0 ? (
        <Card className="mt-lg">
          <p className="text-label-md text-muted">报名节点提醒（{nodes[0]!.exam_name}）</p>
          <ul className="mt-sm space-y-xxs text-caption text-body">
            {nodes.map((n) => (
              <li key={n.id}>
                {n.kind} · {n.date}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* 结果（CL-08 step2–3） */}
      {matches ? (
        <section className="mt-xl">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title-lg text-ink">匹配结果</h2>
            {compare.length > 0 ? (
              <span className="text-caption text-muted">已选 {compare.length}/5 对比</span>
            ) : null}
          </div>

          {reportable.length === 0 ? (
            <div className="mt-lg">
              <EmptyState
                why="没有符合资格条件的职位。"
                action="检查专业名称是否与目录一致，或放宽地区偏好后再试。"
              />
            </div>
          ) : (
            <ul className="mt-md space-y-md">
              {reportable.map((m, i) => {
                const pos = m.position;
                const open = expanded === pos.id;
                const fav = jobFavorites.includes(pos.id);
                return (
                  <li key={pos.id} className="rounded-lg border border-border bg-surface p-lg">
                    <div className="flex items-start justify-between gap-md">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : pos.id)}
                        className="text-left"
                        aria-expanded={open}
                      >
                        <p className="text-body-md text-ink">
                          {i + 1}. {pos.name}
                          {m.tier ? (
                            <Chip tone={m.tier === "稳" ? "insight" : m.tier === "冲" ? "opportunity" : "neutral"}>
                              {m.tier}
                            </Chip>
                          ) : null}
                        </p>
                        <p className="mt-xxs text-caption text-muted">
                          {pos.department} · {pos.region} · 招 {pos.recruiting} 人
                          {m.competitionRatio != null ? ` · 约 ${m.competitionRatio}:1` : ""}
                        </p>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-xxs">
                        <button
                          type="button"
                          onClick={() => toggleJobFavorite(pos.id)}
                          aria-label={fav ? "取消收藏" : "收藏"}
                          className="text-caption text-primary"
                        >
                          {fav ? "★ 已收藏" : "☆ 收藏"}
                        </button>
                        {m.verdict === "可报" ? (
                          <label className="flex items-center gap-xxs text-caption text-muted">
                            <input
                              type="checkbox"
                              checked={compare.includes(pos.id)}
                              onChange={() => toggleCompare(pos.id)}
                              className="h-3.5 w-3.5"
                            />
                            对比
                          </label>
                        ) : null}
                      </div>
                    </div>

                    {/* F0265 匹配理由 */}
                    <ul className="mt-sm space-y-xxs">
                      {m.reasons.map((r) => (
                        <li key={r} className="text-caption text-body">
                          · {r}
                        </li>
                      ))}
                    </ul>

                    {/* F0270 数据新鲜度 */}
                    <p className={`mt-xs text-micro ${m.dataStale ? "text-warning" : "text-muted-soft"}`}>
                      数据来源：{pos.source.name} · 更新于 {pos.source.updatedAt}
                      {m.dataStale ? "（已超一年，请核对最新公告）" : ""}
                    </p>

                    {/* F0261 同义匹配人工复核提示 */}
                    {m.checks.some((c) => c.needsConfirm) ? (
                      <p className="mt-xs text-caption text-warning">
                        专业为目录同义匹配，报名前请人工复核。
                      </p>
                    ) : null}

                    {/* F0266–F0268 历年数据（展开） */}
                    {open ? (
                      <div className="mt-md rounded-md bg-surface-soft p-md">
                        <p className="text-label-md text-muted">历年招录与进面（F0266/F0267/F0268）</p>
                        <table className="mt-xs w-full text-caption text-body">
                          <thead>
                            <tr className="text-left text-muted">
                              <th className="pr-md font-medium">年份</th>
                              <th className="pr-md font-medium">招录</th>
                              <th className="pr-md font-medium">进面分</th>
                              <th className="font-medium">报名</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pos.history.map((h) => (
                              <tr key={h.year}>
                                <td className="pr-md">{h.year}</td>
                                <td className="pr-md">{h.recruited}</td>
                                <td className="pr-md">{h.interviewScore ?? "无数据"}</td>
                                <td>{h.applicants ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* 不可报的折叠展示（F0260 逐条原因） */}
          {(matches ?? []).some((m) => m.verdict === "不可报") ? (
            <details className="mt-lg">
              <summary className="cursor-pointer text-body-sm text-muted">
                不可报职位与原因（{(matches ?? []).filter((m) => m.verdict === "不可报").length}）
              </summary>
              <ul className="mt-sm space-y-md">
                {(matches ?? [])
                  .filter((m) => m.verdict === "不可报")
                  .map((m) => (
                    <li key={m.position.id} className="rounded-md border border-border bg-surface p-md">
                      <p className="text-body-sm text-ink">{m.position.name}</p>
                      <ul className="mt-xs space-y-xxs">
                        {m.checks
                          .filter((c) => !c.pass)
                          .map((c) => (
                            <li key={c.field} className="text-caption text-error">
                              ✗ {c.field}：{c.reason}
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}

          {/* F0271 对比 */}
          {compare.length >= 2 ? (
            <Card className="mt-xl">
              <p className="text-label-md text-muted">
                职位对比（{compare.length} 个，F0271 支持 3–5 个）
              </p>
              <div className="mt-sm overflow-x-auto">
                <table className="w-full text-caption">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pr-md font-medium">职位</th>
                      <th className="pr-md font-medium">招录</th>
                      <th className="pr-md font-medium">竞争比</th>
                      <th className="font-medium">分组</th>
                    </tr>
                  </thead>
                  <tbody className="text-body">
                    {reportable
                      .filter((m) => compare.includes(m.position.id))
                      .map((m) => (
                        <tr key={m.position.id} className="border-t border-border">
                          <td className="pr-md py-xxs">{m.position.name}</td>
                          <td className="pr-md">{m.position.recruiting}</td>
                          <td className="pr-md">{m.competitionRatio ?? "—"}</td>
                          <td>{m.tier ?? "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* CL-08 step5：目标岗位 → 目标分联动提示 */}
          {reportable.length > 0 ? (
            <Card className="mt-lg">
              <p className="text-body-sm text-body">
                选定意向岗位后，建议回到
                <Link href="/onboarding" className="mx-xxs text-primary underline-offset-2 hover:underline">
                  目标设置
                </Link>
                参照该岗位历年进面分校准目标分数——目标修改会触发计划重算。
              </p>
            </Card>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
