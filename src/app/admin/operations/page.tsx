"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { adminApi, staffMe } from "@/lib/auth/adminClient";

interface Notice { id: string; title: string; body: string; status: string }
interface Template { id: string; kind: string; template: string }

/** 运营位与消息模板（F0356/F0357）：草稿不外发，发布后进入用户端。 */
export default function AdminOperationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });

  const load = useCallback(async (): Promise<void> => {
    const data = await adminApi<{ notices?: Notice[]; message_templates?: Template[] }>("/api/admin/operations");
    if (!data.ok) { setMessage(data.message ?? "读取运营配置失败"); return; }
    setNotices(data.notices ?? []);
    setTemplates(data.message_templates ?? []);
  }, []);

  useEffect(() => {
    void staffMe().then((staff) => {
      if (!staff) { setMessage("请先登录后台。"); return; }
      setReady(true);
      void load();
    });
  }, [load]);

  const save = async (key: "notices" | "message_templates", value: unknown, note: string): Promise<void> => {
    const data = await adminApi("/api/admin/operations", { method: "POST", body: JSON.stringify({ key, value }) });
    setMessage(data.ok ? note : (data.message ?? "保存失败"));
    if (data.ok) await load();
  };

  if (!ready) return <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl"><p className="text-body-md text-muted">正在验证后台身份…</p></main>;

  return (
    <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-center justify-between gap-md">
        <div>
          <p className="text-micro text-primary">F0356 / F0357</p>
          <h1 className="mt-xs text-headline-xl text-ink">运营位与消息模板</h1>
          <p className="mt-xs text-body-sm text-muted">公告仅在「已发布」后出现在今日页；模板用于替换提醒文案，占位符如 {"{knowledgePoint}"}。</p>
        </div>
        <Link href="/admin" className="text-label-md text-primary">返回后台</Link>
      </header>

      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">公告（{notices.length}）</h2>
        <ul className="mt-md space-y-sm">
          {notices.map((notice) => (
            <li key={notice.id} className="rounded-md border border-border bg-surface p-md">
              <p className="text-body-sm text-ink">{notice.title}</p>
              <p className="mt-xxs text-caption text-muted">{notice.body}</p>
              <div className="mt-sm flex items-center gap-sm">
                <span className="text-caption text-muted">状态：{notice.status}</span>
                <Button
                  variant="secondary"
                  onClick={() => void save("notices", notices.map((item) => item.id === notice.id ? { ...item, status: item.status === "已发布" ? "草稿" : "已发布" } : item), notice.status === "已发布" ? "已撤回公告" : "已发布公告")}
                >
                  {notice.status === "已发布" ? "撤回" : "发布"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-md grid gap-sm">
          <input aria-label="公告标题" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="公告标题" className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" />
          <input aria-label="公告内容" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} placeholder="公告内容" className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" />
          <Button
            variant="secondary"
            disabled={draft.title.trim() === "" || draft.body.trim() === ""}
            onClick={async () => {
              await save("notices", [...notices, { id: `n-${Date.now()}`, title: draft.title.trim(), body: draft.body.trim(), status: "草稿" }], "已新增公告草稿");
              setDraft({ title: "", body: "" });
            }}
          >
            新增草稿
          </Button>
        </div>
      </section>

      <section className="mt-xl">
        <h2 className="text-title-lg text-ink">消息模板（{templates.length}）</h2>
        <ul className="mt-md space-y-sm">
          {templates.map((template) => (
            <li key={template.id} className="rounded-md border border-border bg-surface p-md">
              <p className="text-caption text-muted">{template.kind}</p>
              <input
                aria-label={`模板 ${template.kind}`}
                value={template.template}
                onChange={(e) => setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, template: e.target.value } : item))}
                className="mt-xs h-11 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink"
              />
            </li>
          ))}
        </ul>
        <Button className="mt-md" variant="secondary" onClick={() => void save("message_templates", templates, "消息模板已保存")}>保存模板</Button>
      </section>

      {message ? <p role="status" className="mt-md rounded-sm bg-surface-soft p-md text-body-sm text-body">{message}</p> : null}
    </main>
  );
}
