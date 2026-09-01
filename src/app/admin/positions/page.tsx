"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, getStaffToken, staffMe } from "@/lib/auth/adminClient";
import { Button } from "@/components/ui/Button";

const FIELDS = ["id", "name", "department", "region", "unitLevel", "recruiting", "minEducation", "majorCategories", "politicalRequirement", "requiresGrassroots", "freshOnly", "history", "sourceName", "sourceFile", "sourceUpdatedAt"] as const;

type Preview = { headers: string[]; proposedMapping: Record<string, string>; mapping: Record<string, string>; validRows: number; totalRows: number; errors: Array<{ row: number; field?: string; message: string }>; sample: Array<Record<string, unknown>>; format: string; sheetName: string | null };

export default function AdminPositionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void staffMe().then((staff) => {
      if (!staff) { setMessage("请先登录后台。"); return; }
      setReady(true);
      void adminApi<{ runs?: Array<Record<string, unknown>> }>("/api/admin/positions/import/runs").then((data) => { if (data.ok) setRuns(data.runs ?? []); });
    });
  }, []);

  const previewFile = async (): Promise<void> => {
    if (!file) return;
    const form = new FormData(); form.set("file", file); form.set("sourceName", sourceName); form.set("sourceUpdatedAt", sourceUpdatedAt);
    if (Object.keys(mapping).length > 0) form.set("mapping", JSON.stringify(mapping));
    const token = getStaffToken();
    const response = await fetch("/api/admin/positions/import/preview", { method: "POST", body: form, headers: token ? { authorization: `Bearer ${token}` } : undefined });
    const data = await response.json() as { ok: boolean; message?: string } & Partial<Preview>;
    if (!data.ok) { setMessage(data.message ?? "预览失败"); return; }
    const next = data as Preview; setPreview(next); setMapping(next.mapping); setMessage(`已解析 ${next.totalRows} 行：${next.validRows} 行通过，${next.errors.length} 行需要修正。`);
  };

  const commit = async (): Promise<void> => {
    if (!file || !preview || preview.errors.length > 0) return;
    const form = new FormData(); form.set("file", file); form.set("sourceName", sourceName); form.set("sourceUpdatedAt", sourceUpdatedAt); form.set("mapping", JSON.stringify(mapping));
    const token = getStaffToken();
    const response = await fetch("/api/admin/positions/import/commit", { method: "POST", body: form, headers: token ? { authorization: `Bearer ${token}` } : undefined });
    const data = await response.json() as { ok: boolean; message?: string; imported?: number };
    setMessage(data.message ?? (data.ok ? `导入成功 ${data.imported ?? 0} 条` : "导入失败"));
    if (data.ok) { setPreview(null); const history = await adminApi<{ runs?: Array<Record<string, unknown>> }>("/api/admin/positions/import/runs"); if (history.ok) setRuns(history.runs ?? []); }
  };

  if (!ready) return <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl"><p className="text-body-md text-muted">正在验证后台身份…</p></main>;
  return (
    <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-center justify-between gap-md"><div><p className="text-micro text-primary">F0352</p><h1 className="mt-xs text-headline-xl text-ink">职位表导入</h1><p className="mt-xs text-body-sm text-muted">支持 CSV、XLSX、XLSM、JSON；先预览表头映射与逐行校验，全部通过后才原子提交。</p></div><Link href="/admin" className="text-label-md text-primary">返回后台</Link></header>
      <section className="mt-xl rounded-md border border-border bg-surface p-md"><input type="file" accept=".csv,.xlsx,.xlsm,.json" aria-label="职位表文件" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><div className="mt-md grid gap-sm sm:grid-cols-2"><input aria-label="来源名称" value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="来源名称（如 2026 国考职位表）" className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" /><input aria-label="来源更新时间" type="date" value={sourceUpdatedAt} onChange={(event) => setSourceUpdatedAt(event.target.value)} className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" /></div><Button className="mt-md" variant="secondary" disabled={!file} onClick={() => void previewFile()}>解析并预览映射</Button></section>
      {preview ? <section className="mt-lg rounded-md border border-border bg-surface p-md"><h2 className="text-title-lg text-ink">字段映射 · {preview.format}{preview.sheetName ? ` · ${preview.sheetName}` : ""}</h2><p className="mt-xs text-body-sm text-body">{preview.validRows}/{preview.totalRows} 行通过校验</p><div className="mt-md grid gap-sm">{FIELDS.map((field) => <label key={field} className="grid grid-cols-[11rem_1fr] items-center gap-sm text-caption text-muted"><span>{field}</span><select aria-label={`映射 ${field}`} value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))} className="h-10 rounded-sm border border-border-strong bg-surface px-sm text-body-sm text-ink"><option value="">未映射</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>{preview.errors.length > 0 ? <div role="alert" className="mt-md rounded-sm border border-error bg-error-soft p-md text-caption text-error"><p>存在错误，提交已锁定：</p><ul className="mt-xs space-y-xxs">{preview.errors.slice(0, 20).map((error, index) => <li key={index}>第 {error.row} 行 · {error.field ?? "字段"} · {error.message}</li>)}</ul></div> : <Button className="mt-md" onClick={() => void commit()}>确认映射并原子导入</Button>}<details className="mt-md"><summary className="cursor-pointer text-label-md text-primary">查看示例行</summary><pre className="mt-sm max-h-64 overflow-auto rounded-sm bg-canvas-warm p-md text-micro text-body">{JSON.stringify(preview.sample, null, 2)}</pre></details></section> : null}
      <section className="mt-xl"><h2 className="text-title-lg text-ink">导入记录</h2><ul className="mt-md space-y-sm">{runs.map((run, index) => <li key={index} className="rounded-sm border border-border bg-surface p-md text-caption text-body">{String(run.status)} · {String(run.source_file)} · {String(run.imported_rows)}/{String(run.total_rows)} 行 · {String(run.actor)}</li>)}</ul></section>
      {message ? <p role="status" className="mt-md rounded-sm bg-surface-soft p-md text-body-sm text-body">{message}</p> : null}
    </main>
  );
}
