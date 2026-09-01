"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, staffMe } from "@/lib/auth/adminClient";
import { Button } from "@/components/ui/Button";

interface RuleRevision {
  id: number;
  revision: number;
  status: string;
  rules: unknown;
  changeReason: string;
  createdBy: string;
  createdAt: string;
}

export default function AdminRulesPage() {
  const [rows, setRows] = useState<RuleRevision[]>([]);
  const [selected, setSelected] = useState<RuleRevision | null>(null);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const data = await adminApi<{ rules?: RuleRevision[] }>("/api/admin/rules");
    if (!data.ok) { setMessage(data.message ?? "读取资格规则失败"); return; }
    const next = data.rules ?? [];
    setRows(next);
    setSelected((current) => {
      const selectedRevision = current ? next.find((row) => row.revision === current.revision) : next[0];
      if (selectedRevision) setText(JSON.stringify(selectedRevision.rules, null, 2));
      return selectedRevision ?? null;
    });
  }, []);

  useEffect(() => {
    void staffMe().then((staff) => {
      if (!staff) { setMessage("请先登录后台。"); return; }
      setReady(true);
      void load();
    });
  }, [load]);

  const save = async (): Promise<void> => {
    let rules: unknown;
    try { rules = JSON.parse(text); } catch { setMessage("规则 JSON 无法解析。"); return; }
    const data = await adminApi<{ revision?: number; issues?: string[] }>("/api/admin/rules", {
      method: "POST",
      body: JSON.stringify({ action: "saveDraft", rules, changeReason: reason }),
    });
    setMessage(data.ok ? `规则草稿已保存为 r${data.revision}` : `${data.message ?? "保存失败"}${data.issues?.length ? `：${data.issues.join("；")}` : ""}`);
    if (data.ok) { setReason(""); await load(); }
  };

  const publish = async (revision: number): Promise<void> => {
    const data = await adminApi("/api/admin/rules", { method: "POST", body: JSON.stringify({ action: "publish", revision }) });
    setMessage(data.ok ? `规则 r${revision} 已发布` : (data.message ?? "发布失败"));
    if (data.ok) await load();
  };

  if (!ready) return <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl"><p className="text-body-md text-muted">正在验证后台身份…</p></main>;
  return (
    <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-center justify-between gap-md"><div><p className="text-micro text-primary">F0353</p><h1 className="mt-xs text-headline-xl text-ink">资格规则版本</h1><p className="mt-xs text-body-sm text-muted">学历、政治面貌、基层年限与专业同义映射均为确定性规则；草稿不会影响线上匹配，发布后才生效。</p></div><Link href="/admin" className="text-label-md text-primary">返回后台</Link></header>
      <div className="mt-lg flex flex-wrap gap-sm">{rows.map((row) => <button key={row.revision} type="button" onClick={() => { setSelected(row); setText(JSON.stringify(row.rules, null, 2)); }} className={`rounded-full border px-md py-sm text-caption ${selected?.revision === row.revision ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"}`}>r{row.revision} · {row.status}</button>)}</div>
      <label className="mt-lg block"><span className="text-label-md text-muted">规则集 JSON</span><textarea aria-label="资格规则 JSON" value={text} onChange={(event) => setText(event.target.value)} rows={20} className="mt-xs w-full rounded-md border border-border-strong bg-canvas-warm p-md font-mono text-caption text-ink" /></label>
      <div className="mt-md flex gap-sm"><input aria-label="规则变更原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="变更原因（必填）" className="h-11 flex-1 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" /><Button variant="secondary" disabled={!reason.trim()} onClick={() => void save()}>保存草稿</Button>{selected && selected.status !== "published" ? <Button onClick={() => void publish(selected.revision)}>发布 r{selected.revision}</Button> : null}</div>
      <section className="mt-xl rounded-md border border-border bg-surface p-md"><h2 className="text-title-lg text-ink">当前生效规则</h2><pre className="mt-sm overflow-auto rounded-sm bg-canvas-warm p-md text-micro text-body">{JSON.stringify(rows.find((row) => row.status === "published")?.rules ?? {}, null, 2)}</pre></section>
      {message ? <p role="status" className="mt-md rounded-sm bg-surface-soft p-md text-body-sm text-body">{message}</p> : null}
    </main>
  );
}
