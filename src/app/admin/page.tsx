"use client";

/**
 * 管理后台（管理后台 MVP 13 条 + 客服工单）。
 * F0335/0336 用户管理 · F0338 会员管理 · F0340–0343 题库管理（含 F0148 争议题下线）
 * · F0350 考试管理 · F0358 会员配置 · F0361/0362 反馈工单与 AI 问题归类 ·
 * F0364 RBAC · F0365 审计日志。MVP 为单机 mock 面板：交互真实落 store，数据本地。
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAdminStore, type QuestionStatus } from "@/lib/admin/store";
import { useProfileStore } from "@/lib/profile/store";
import { allSeedQuestions } from "@/lib/questions/seed";
import { MODULES } from "@/lib/profile/types";

const STATUSES: QuestionStatus[] = ["草稿", "审核", "已发布", "已下线"];

export default function AdminPage() {
  const [tab, setTab] = useState<"bank" | "users" | "tickets" | "config" | "audit">("bank");
  const tabs = [
    ["bank", "题库"],
    ["users", "用户"],
    ["tickets", "工单"],
    ["config", "配置"],
    ["audit", "审计"],
  ] as const;

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-baseline justify-between">
        <h1 className="text-headline-xl text-ink">管理后台</h1>
        <Link href="/aiops" className="text-label-md text-primary">
          AI 运营台 ›
        </Link>
      </header>
      <nav aria-label="后台导航" className="mt-lg flex gap-sm">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-md py-sm text-label-md ${
              tab === k ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-xl">
        {tab === "bank" ? <BankTab /> : null}
        {tab === "users" ? <UsersTab /> : null}
        {tab === "tickets" ? <TicketsTab /> : null}
        {tab === "config" ? <ConfigTab /> : null}
        {tab === "audit" ? <AuditTab /> : null}
      </div>
    </main>
  );
}

function BankTab() {
  const { questionStatus, setQuestionStatus } = useAdminStore();
  const [filter, setFilter] = useState<string>("全部");
  const [importText, setImportText] = useState("");
  const [importReport, setImportReport] = useState<string | null>(null);

  const questions = useMemo(() => allSeedQuestions(), []);
  const visible = questions.filter((q) => filter === "全部" || q.moduleId === filter);

  // F0341 批量导入：JSON 数组 → 结构校验与失败报告（mock：校验字段完备性）
  const runImport = (): void => {
    try {
      const arr = JSON.parse(importText) as Array<Record<string, unknown>>;
      const problems: string[] = [];
      arr.forEach((row, i) => {
        for (const key of ["moduleId", "stem", "options", "answerIndex", "explanation"]) {
          if (row[key] == null) problems.push(`第 ${i + 1} 条缺少 ${key}`);
        }
        if (Array.isArray(row.options) && row.options.length !== 4) {
          problems.push(`第 ${i + 1} 条选项数不是 4`);
        }
      });
      setImportReport(
        problems.length === 0
          ? `校验通过 ${arr.length} 条，已进入「草稿」待审核。`
          : `校验失败 ${problems.length} 处：\n${problems.slice(0, 5).join("\n")}`,
      );
    } catch {
      setImportReport("JSON 解析失败，请检查格式。");
    }
  };

  return (
    <section>
      <div className="flex flex-wrap gap-sm" role="group" aria-label="模块筛选">
        {["全部", ...MODULES].map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={filter === m}
            onClick={() => setFilter(m)}
            className={`rounded-full border px-md py-sm text-label-md ${
              filter === m ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* F0340/0341 录入与批量导入 */}
      <details className="mt-lg">
        <summary className="cursor-pointer text-body-sm text-primary">批量导入题目（JSON）</summary>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          aria-label="题目 JSON"
          placeholder='[{"moduleId":"资料分析","stem":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]'
          className="mt-sm w-full rounded-sm border border-border-strong bg-surface p-md text-caption text-ink"
        />
        <Button className="mt-sm" variant="secondary" onClick={runImport} disabled={importText.trim() === ""}>
          校验并导入
        </Button>
        {importReport ? (
          <pre className="mt-sm whitespace-pre-wrap rounded-sm bg-surface-soft p-md text-caption text-body">
            {importReport}
          </pre>
        ) : null}
      </details>

      {/* F0342/0343 状态流与下线 */}
      <ul className="mt-lg divide-y divide-border rounded-lg border border-border bg-surface">
        {visible.map((q) => {
          const status = questionStatus[q.id] ?? "已发布";
          return (
            <li key={q.id} className="px-lg py-md">
              <div className="flex items-start justify-between gap-sm">
                <p className="text-body-sm text-body">
                  {q.stem.split("\n")[0]}
                  <span className="ml-sm text-caption text-muted-soft">
                    {q.id} · {q.moduleId}
                    {q.realExam ? ` · ${q.realExam.year}${q.realExam.region}` : ""}
                  </span>
                </p>
                <Chip tone={status === "已下线" ? "warning" : status === "已发布" ? "insight" : "neutral"}>
                  {status}
                </Chip>
              </div>
              <div className="mt-sm flex flex-wrap gap-sm">
                {STATUSES.filter((s) => s !== status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuestionStatus(q.id, s, "admin")}
                    className="rounded-full border border-border px-md py-xxs text-caption text-muted"
                  >
                    → {s}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-md text-caption text-muted-soft">
        「已下线」的题不再进入训练组卷，历史作答记录不受影响（F0343/F0148）。
      </p>
    </section>
  );
}

function UsersTab() {
  const { profile, membership, imports } = useProfileStore();
  const [q, setQ] = useState("");
  // F0336：概览可见，敏感原始内容默认不展示
  const hit = q === "" || profile.goal?.examName.includes(q) || profile.nickname.includes(q);
  return (
    <section>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="按考试或昵称检索用户"
        placeholder="按昵称 / 考试检索"
        className="h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-body-md text-ink"
      />
      {hit ? (
        <Card className="mt-lg">
          <p className="text-title-md text-ink">{profile.nickname || "（未设昵称）"}</p>
          <p className="mt-xs text-body-sm text-body">
            {profile.goal ? `${profile.goal.examName} · ${profile.goal.region}` : "未设置目标"}
          </p>
          <dl className="mt-md space-y-xs text-body-sm">
            <div className="flex justify-between">
              <dt className="text-muted">会员</dt>
              <dd>{membership.plan === "free" ? "免费版" : membership.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">诊断额度</dt>
              <dd>
                {membership.usedDiagnosis}/{membership.diagnosisQuota}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">成绩记录</dt>
              <dd>{imports.length} 次</dd>
            </div>
          </dl>
          <p className="mt-md text-caption text-muted-soft">
            敏感原始内容（作答明细、聊天记录）默认不在此展示（F0336）。
          </p>
        </Card>
      ) : (
        <p className="mt-lg text-body-sm text-muted">无匹配用户。</p>
      )}
    </section>
  );
}

function TicketsTab() {
  const { feedbacks, aiFeedback } = useProfileStore();
  return (
    <section>
      <h2 className="text-title-lg text-ink">功能反馈（F0361）</h2>
      {feedbacks.length === 0 ? (
        <p className="mt-md text-body-sm text-muted">暂无功能反馈。</p>
      ) : (
        <ul className="mt-md space-y-md">
          {feedbacks.map((f) => (
            <li key={f.id} className="rounded-md border border-border bg-surface p-md">
              <p className="text-caption text-muted">
                {f.type} · {new Date(f.at).toLocaleString("zh-CN")}
                {f.hasScreenshot ? " · 附截图" : ""}
              </p>
              <p className="mt-xs text-body-sm text-body">{f.text}</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-xl text-title-lg text-ink">AI 问题反馈（F0362 归类）</h2>
      {aiFeedback.length === 0 ? (
        <p className="mt-md text-body-sm text-muted">暂无 AI 反馈。</p>
      ) : (
        <ul className="mt-md space-y-md">
          {aiFeedback.map((f) => {
            // 简单归类规则：解析/诊断/教练 → 对应评测集入口
            const category = f.target.startsWith("diagnosis")
              ? "诊断不准"
              : f.target.startsWith("session")
                ? "解析错误"
                : "其他";
            return (
              <li key={f.id} className="rounded-md border border-border bg-surface p-md">
                <div className="flex items-center justify-between">
                  <Chip tone={f.helpful === false ? "warning" : "insight"}>
                    {f.helpful === false ? "没帮助" : "有帮助"}
                  </Chip>
                  <span className="text-caption text-muted">{category}</span>
                </div>
                <p className="mt-xs text-caption text-muted-soft">
                  {f.target} · {new Date(f.at).toLocaleString("zh-CN")}
                  {f.reported ? " · 已举报" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConfigTab() {
  const { exams, plans, addExam, addPlan } = useAdminStore();
  const [examName, setExamName] = useState("");
  const [planName, setPlanName] = useState("");
  return (
    <section className="space-y-xl">
      <div>
        <h2 className="text-title-lg text-ink">考试批次（F0350）</h2>
        <ul className="mt-md space-y-sm">
          {exams.map((e) => (
            <li key={e.id} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              {e.name} · {e.region} · {e.date} · {e.subjects}
            </li>
          ))}
        </ul>
        <div className="mt-md flex gap-sm">
          <input
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            aria-label="新考试名称"
            placeholder="如 2027年省考"
            className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
          />
          <Button
            variant="secondary"
            disabled={examName.trim() === ""}
            onClick={() => {
              addExam({ name: examName.trim(), region: "待定", date: "待定", subjects: "行测+申论" });
              setExamName("");
            }}
          >
            新增
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-title-lg text-ink">会员套餐（F0358）</h2>
        <ul className="mt-md space-y-sm">
          {plans.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              {p.name} · ¥{p.price} · {p.benefits}
            </li>
          ))}
        </ul>
        <div className="mt-md flex gap-sm">
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            aria-label="新套餐名称"
            placeholder="如 Pro 学生版"
            className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
          />
          <Button
            variant="secondary"
            disabled={planName.trim() === ""}
            onClick={() => {
              addPlan({ name: planName.trim(), price: 29, benefits: "待定权益" });
              setPlanName("");
            }}
          >
            新增
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-title-lg text-ink">角色权限（F0364 RBAC）</h2>
        <div className="mt-md overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-caption">
            <thead>
              <tr className="bg-surface-soft text-left text-muted">
                <th className="p-md">能力</th>
                <th className="p-md">运营</th>
                <th className="p-md">教研</th>
                <th className="p-md">客服</th>
                <th className="p-md">AI运营</th>
              </tr>
            </thead>
            <tbody className="text-body">
              {[
                ["题库管理", "✓", "✓", "—", "—"],
                ["用户/会员", "✓", "—", "只读", "—"],
                ["反馈工单", "✓", "—", "✓", "只读"],
                ["模型/Prompt/评测", "—", "—", "—", "✓"],
                ["审计日志", "只读", "—", "—", "只读"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  {row.map((c, i) => (
                    <td key={i} className="p-md">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditTab() {
  const { auditLog } = useAdminStore();
  return (
    <section>
      <h2 className="text-title-lg text-ink">审计日志（F0365）</h2>
      <p className="mt-xs text-caption text-muted">
        记录题库状态变更、考试/套餐配置变更等高风险操作。
      </p>
      {auditLog.length === 0 ? (
        <p className="mt-lg text-body-sm text-muted">暂无记录。</p>
      ) : (
        <ul className="mt-md space-y-sm">
          {auditLog.map((a, i) => (
            <li key={i} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              <span className="text-caption text-muted">
                {new Date(a.at).toLocaleString("zh-CN")} · {a.actor}
              </span>
              <br />
              {a.action}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
