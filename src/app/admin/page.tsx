"use client";

/**
 * 管理后台（服务端化）：数据来自 /api/admin/*（SQLite），操作带 Bearer 员工 token，
 * 服务端按 F0364 角色矩阵校验，前端仅按角色隐藏无权限的写操作。
 * 种子员工见 /admin-login 页脚。
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/StateViews";
import { adminApi, staffLogout, staffMe, type StaffIdentity } from "@/lib/auth/adminClient";

const STATUSES = ["草稿", "审核", "已发布", "已下线"] as const;
type QuestionStatus = (typeof STATUSES)[number];

interface QuestionRow {
  id: string;
  moduleId: string;
  stem: string;
  knowledgePoint: string;
  realExam: { year: number; region: string; exam: string } | null;
  status: string;
}

const TABS = [
  ["bank", "题库"],
  ["users", "用户"],
  ["tickets", "工单"],
  ["config", "配置"],
  ["audit", "审计"],
] as const;

const ROLE_LABEL: Record<StaffIdentity["role"], string> = {
  operations: "运营",
  teaching: "教研",
  support: "客服",
  aiops: "AI运营",
  admin: "管理员",
};

/** 角色能力（与服务端 F0364 矩阵一致；服务端仍是强校验方） */
const CAN: Record<StaffIdentity["role"], Record<string, boolean>> = {
  operations: { bankWrite: true, ticketsWrite: true, configWrite: true, auditRead: true },
  teaching: { bankWrite: true, ticketsWrite: false, configWrite: false, auditRead: false },
  support: { bankWrite: false, ticketsWrite: true, configWrite: false, auditRead: false },
  aiops: { bankWrite: false, ticketsWrite: false, configWrite: false, auditRead: false },
  admin: { bankWrite: true, ticketsWrite: true, configWrite: true, auditRead: true },
};

export default function AdminPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("bank");

  useEffect(() => {
    void staffMe().then((s) => {
      if (!s) {
        router.replace("/admin-login");
        return;
      }
      setStaff(s);
      setLoading(false);
    });
  }, [router]);

  const can = (cap: string): boolean => (staff ? CAN[staff.role][cap] ?? false : false);

  if (loading || !staff) {
    return (
      <main className="mx-auto max-w-[430px] px-margin-mobile pt-xl">
        <p className="text-body-md text-muted">正在验证员工身份…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-baseline justify-between gap-sm">
        <div>
          <h1 className="text-headline-xl text-ink">管理后台</h1>
          <p className="mt-xs text-caption text-muted">
            {staff.display_name} · {ROLE_LABEL[staff.role]}（服务端 RBAC 生效）
          </p>
        </div>
        <div className="flex items-center gap-md">
          <Link href="/aiops" className="text-label-md text-primary">
            AI 运营台 ›
          </Link>
          <button
            type="button"
            onClick={async () => {
              await staffLogout();
              router.replace("/admin-login");
            }}
            className="text-caption text-muted underline-offset-2 hover:underline"
          >
            退出
          </button>
        </div>
      </header>

      <nav aria-label="后台导航" className="mt-lg flex gap-sm">
        {TABS.map(([k, label]) => (
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
        {tab === "bank" ? <BankTab canWrite={can("bankWrite")} /> : null}
        {tab === "users" ? <UsersTab /> : null}
        {tab === "tickets" ? <TicketsTab canWrite={can("ticketsWrite")} /> : null}
        {tab === "config" ? <ConfigTab canWrite={can("configWrite")} /> : null}
        {tab === "audit" ? <AuditTab canRead={can("auditRead")} /> : null}
      </div>
    </main>
  );
}

function BankTab({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [filter, setFilter] = useState("全部");
  const [importText, setImportText] = useState("");
  const [report, setReport] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const data = await adminApi<{ rows: QuestionRow[] }>("/api/admin/questions");
    if (data.ok) setRows(data.rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (qid: string, status: QuestionStatus): Promise<void> => {
    const r = await adminApi("/api/admin/questions", {
      method: "POST",
      body: JSON.stringify({ action: "status", qid, status }),
    });
    if (r.ok) void load();
    else setReport(r.message ?? "操作失败");
  };

  const runImport = async (): Promise<void> => {
    let rows: unknown;
    try {
      rows = JSON.parse(importText);
    } catch {
      setReport("JSON 解析失败，请检查格式。");
      return;
    }
    const r = await adminApi<{ problems?: string[]; message?: string }>("/api/admin/questions", {
      method: "POST",
      body: JSON.stringify({ action: "import", rows }),
    });
    setReport(r.ok ? (r.message ?? "导入成功") : `校验失败 ${r.problems?.length ?? 0} 处：\n${(r.problems ?? []).slice(0, 5).join("\n")}`);
    if (r.ok) void load();
  };

  const visible = rows.filter((q) => filter === "全部" || q.moduleId === filter);

  return (
    <section>
      <div className="flex flex-wrap gap-sm" role="group" aria-label="模块筛选">
        {["全部", "言语理解", "判断推理", "数量关系", "资料分析", "常识判断"].map((m) => (
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

      {canWrite ? (
        <details className="mt-lg">
          <summary className="cursor-pointer text-body-sm text-primary">批量导入题目（JSON）</summary>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            aria-label="题目 JSON"
            className="mt-sm w-full rounded-sm border border-border-strong bg-surface p-md text-caption text-ink"
          />
          <Button className="mt-sm" variant="secondary" disabled={importText.trim() === ""} onClick={runImport}>
            校验并导入
          </Button>
        </details>
      ) : null}
      {report ? (
        <pre className="mt-sm whitespace-pre-wrap rounded-sm bg-surface-soft p-md text-caption text-body">{report}</pre>
      ) : null}

      {!canWrite ? (
        <p className="mt-lg text-caption text-muted-soft">当前角色为只读（服务端已同步限制写接口）。</p>
      ) : null}

      <ul className="mt-lg divide-y divide-border rounded-lg border border-border bg-surface">
        {visible.map((q) => (
          <li key={q.id} className="px-lg py-md">
            <div className="flex items-start justify-between gap-sm">
              <p className="text-body-sm text-body">
                {q.stem}
                <span className="ml-sm text-caption text-muted-soft">
                  {q.id} · {q.moduleId}
                  {q.realExam ? ` · ${q.realExam.year}${q.realExam.region}` : ""}
                </span>
              </p>
              <Chip tone={q.status === "已下线" ? "warning" : q.status === "已发布" ? "insight" : "neutral"}>
                {q.status}
              </Chip>
            </div>
            {canWrite ? (
              <div className="mt-sm flex flex-wrap gap-sm">
                {STATUSES.filter((s) => s !== q.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(q.id, s)}
                    className="rounded-full border border-border px-md py-xxs text-caption text-muted"
                  >
                    → {s}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-md text-caption text-muted-soft">
        「已下线」的题立即从服务端组卷过滤中生效；历史作答记录不受影响（F0343/F0148）。
      </p>
    </section>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<Array<{ id: number; phone: string; nickname: string | null; active_tokens: number; permission_records: number }>>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void adminApi<{ rows: typeof rows }>("/api/admin/users").then((d) => {
      if (d.ok) setRows(d.rows);
    });
  }, []);

  const visible = rows.filter(
    (u) => q === "" || u.phone.includes(q) || (u.nickname ?? "").includes(q),
  );

  return (
    <section>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="按手机号或昵称检索用户"
        placeholder="按手机号 / 昵称检索"
        className="h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-body-md text-ink"
      />
      {visible.length === 0 ? (
        <div className="mt-lg">
          <EmptyState why="无匹配用户。" action="用户来自短信登录建档（数据库模拟数据含 3 个种子用户）。" />
        </div>
      ) : (
        <ul className="mt-lg divide-y divide-border rounded-lg border border-border bg-surface">
          {visible.map((u) => (
            <li key={u.id} className="px-lg py-md">
              <p className="text-body-md text-ink">
                {u.nickname ?? "（未设昵称）"}
                <span className="ml-sm text-caption text-muted">{u.phone}</span>
              </p>
              <p className="mt-xs text-caption text-muted">
                有效会话 {u.active_tokens} · 授权记录 {u.permission_records} 条
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-md text-caption text-muted-soft">
        学习明细与作答内容默认不在此展示（F0336）。
      </p>
    </section>
  );
}

function TicketsTab({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Array<{ id: number; category: string; type: string; text: string; has_screenshot: number; status: string; created_at: string }>>([]);

  const load = useCallback(async (): Promise<void> => {
    const d = await adminApi<{ rows: typeof rows }>("/api/admin/tickets");
    if (d.ok) setRows(d.rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: number): Promise<void> => {
    const r = await adminApi("/api/admin/tickets", {
      method: "PATCH",
      body: JSON.stringify({ id, status: "已处理" }),
    });
    if (r.ok) void load();
  };

  return (
    <section>
      <h2 className="text-title-lg text-ink">反馈与 AI 问题工单</h2>
      <p className="mt-xs text-caption text-muted">
        用户反馈（F0318）与 AI 结果反馈（F0319/F0362 归类：解析错误/诊断不准/其他）。
      </p>
      {rows.length === 0 ? (
        <div className="mt-lg">
          <EmptyState why="暂无工单。" action="用户在 App 内提交反馈后会出现在这里。" />
        </div>
      ) : (
        <ul className="mt-lg space-y-md">
          {rows.map((t) => (
            <li key={t.id} className="rounded-md border border-border bg-surface p-md">
              <div className="flex items-center justify-between gap-sm">
                <Chip tone={t.category === "其他" ? "neutral" : "warning"}>{t.category}</Chip>
                <Chip tone={t.status === "已处理" ? "insight" : "neutral"}>{t.status}</Chip>
              </div>
              <p className="mt-sm text-body-sm text-body">{t.text}</p>
              <p className="mt-xs text-caption text-muted-soft">
                {t.type} · {new Date(t.created_at).toLocaleString("zh-CN")}
                {t.has_screenshot === 1 ? " · 附截图" : ""}
              </p>
              {canWrite && t.status !== "已处理" ? (
                <Button className="mt-sm" variant="secondary" onClick={() => resolve(t.id)}>
                  标记已处理
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConfigTab({ canWrite }: { canWrite: boolean }) {
  const [exams, setExams] = useState<Array<{ id: number; name: string; region: string; date: string; subjects: string }>>([]);
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: number; benefits: string }>>([]);
  const [positions, setPositions] = useState<Array<{ qid: string; name: string; source_updated_at: string }>>([]);
  const [importText, setImportText] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [examName, setExamName] = useState("");
  const [planName, setPlanName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [e, p, pos] = await Promise.all([
      adminApi<{ rows: typeof exams }>("/api/admin/exams"),
      adminApi<{ rows: typeof plans }>("/api/admin/plans"),
      adminApi<{ rows: typeof positions }>("/api/admin/positions"),
    ]);
    if (e.ok) setExams(e.rows);
    if (p.ok) setPlans(p.rows);
    if (pos.ok) setPositions(pos.rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addExam = async (): Promise<void> => {
    const r = await adminApi("/api/admin/exams", {
      method: "POST",
      body: JSON.stringify({ name: examName.trim() }),
    });
    if (r.ok) {
      setExamName("");
      void load();
    } else {
      setError(r.message ?? "新增失败");
    }
  };

  const addPlan = async (): Promise<void> => {
    const r = await adminApi("/api/admin/plans", {
      method: "POST",
      body: JSON.stringify({ name: planName.trim() }),
    });
    if (r.ok) {
      setPlanName("");
      void load();
    } else {
      setError(r.message ?? "新增失败");
    }
  };

  return (
    <section className="space-y-xl">
      {error ? <p role="alert" className="text-body-sm text-error">{error}</p> : null}

      <div>
        <h2 className="text-title-lg text-ink">考试批次（F0350）</h2>
        <ul className="mt-md space-y-sm">
          {exams.map((e) => (
            <li key={e.id} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              {e.name} · {e.region} · {e.date} · {e.subjects}
            </li>
          ))}
        </ul>
        {canWrite ? (
          <div className="mt-md flex gap-sm">
            <input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              aria-label="新考试名称"
              placeholder="如 2027年省考"
              className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
            />
            <Button variant="secondary" disabled={examName.trim() === ""} onClick={addExam}>
              新增
            </Button>
          </div>
        ) : null}
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
        {canWrite ? (
          <div className="mt-md flex gap-sm">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              aria-label="新套餐名称"
              placeholder="如 Pro 学生版"
              className="h-10 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
            />
            <Button variant="secondary" disabled={planName.trim() === ""} onClick={addPlan}>
              新增
            </Button>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="text-title-lg text-ink">职位库（F0352–F0355）</h2>
        <p className="mt-xs text-caption text-muted">
          当前 {positions.length} 个职位；每条数据要求来源与更新时间（F0354）。
        </p>
        <ul className="mt-md space-y-xxs text-caption text-body">
          {positions.slice(0, 6).map((p) => (
            <li key={p.qid}>
              {p.qid} · {p.name} · 来源更新 {p.source_updated_at}
            </li>
          ))}
          {positions.length > 6 ? <li className="text-muted-soft">…其余 {positions.length - 6} 条</li> : null}
        </ul>
        {canWrite ? (
          <details className="mt-md">
            <summary className="cursor-pointer text-body-sm text-primary">批量导入职位表（JSON，F0352）</summary>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              aria-label="职位 JSON"
              placeholder='[{"id":"job-101","name":"…","department":"…","region":"…","minEducation":"本科","majorCategories":["计算机类"],"recruiting":2,"sourceName":"2026职位表","sourceUpdatedAt":"2026-08-31"}]'
              className="mt-sm w-full rounded-sm border border-border-strong bg-surface p-md text-caption text-ink"
            />
            <Button
              className="mt-sm"
              variant="secondary"
              disabled={importText.trim() === ""}
              onClick={async () => {
                let rows: unknown;
                try {
                  rows = JSON.parse(importText);
                } catch {
                  setReport("JSON 解析失败，请检查格式。");
                  return;
                }
                const r = await adminApi<{ inserted?: number; problems?: string[]; message?: string }>(
                  "/api/admin/positions",
                  { method: "POST", body: JSON.stringify({ rows }) },
                );
                setReport(r.message ?? (r.ok ? "导入成功" : "导入失败"));
                if (r.ok) void load();
              }}
            >
              校验并导入
            </Button>
          </details>
        ) : null}
        {report ? (
          <pre className="mt-sm whitespace-pre-wrap rounded-sm bg-surface-soft p-md text-caption text-body">{report}</pre>
        ) : null}
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

function AuditTab({ canRead }: { canRead: boolean }) {
  const [rows, setRows] = useState<Array<{ at: string; actor: string; role: string; action: string }>>([]);

  useEffect(() => {
    if (!canRead) return;
    void adminApi<{ rows: typeof rows }>("/api/admin/audit").then((d) => {
      if (d.ok) setRows(d.rows);
    });
  }, [canRead]);

  if (!canRead) {
    return <EmptyState why="当前角色无审计查看权限。" action="审计仅运营与管理员可见（F0365）。" />;
  }

  return (
    <section>
      <h2 className="text-title-lg text-ink">审计日志（F0365）</h2>
      <p className="mt-xs text-caption text-muted">服务端只增记录：含越权尝试。</p>
      {rows.length === 0 ? (
        <p className="mt-lg text-body-sm text-muted">暂无记录。</p>
      ) : (
        <ul className="mt-md space-y-sm">
          {rows.map((a, i) => (
            <li key={i} className="rounded-md border border-border bg-surface p-md text-body-sm text-body">
              <span className="text-caption text-muted">
                {new Date(a.at).toLocaleString("zh-CN")} · {a.actor}（{a.role}）
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
