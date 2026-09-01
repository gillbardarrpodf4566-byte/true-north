"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { adminApi, staffMe } from "@/lib/auth/adminClient";

interface Revision {
  questionId: string;
  revision: number;
  status: "draft" | "published" | "archived";
  changeReason: string;
  createdBy: string;
  createdAt: string;
}

export default function AdminEssayContentPage() {
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [bundleText, setBundleText] = useState("");
  const [reason, setReason] = useState("");
  const [ticketRef, setTicketRef] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [diff, setDiff] = useState<Array<{ field: string; changed: boolean; before: string; after: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadQuestion = async (id: string, selectedRevision?: number): Promise<void> => {
    if (!id) return;
    const query = selectedRevision ? `?questionId=${encodeURIComponent(id)}&revision=${selectedRevision}` : `?questionId=${encodeURIComponent(id)}`;
    const data = await adminApi<{ questions?: string[]; revisions?: Revision[]; bundle?: unknown; meta?: { revision: number } }>(`/api/admin/content${query}`);
    if (!data.ok) { setMessage(data.message ?? "读取内容失败"); return; }
    setQuestionIds(data.questions ?? questionIds);
    setQuestionId(id);
    setRevisions(data.revisions ?? []);
    const selected = data.meta?.revision ?? selectedRevision ?? data.revisions?.find((item) => item.status === "published")?.revision ?? null;
    setRevision(selected);
    setBundleText(data.bundle ? JSON.stringify(data.bundle, null, 2) : "");
  };

  useEffect(() => {
    void staffMe().then((staff) => {
      if (!staff) { setMessage("请先登录后台。"); return; }
      setReady(true);
      void adminApi<{ questions?: string[] }>("/api/admin/content").then((data) => {
        if (data.ok) {
          const ids = data.questions ?? [];
          setQuestionIds(ids);
          if (ids[0]) void loadQuestion(ids[0]);
        } else setMessage(data.message ?? "读取内容失败");
      });
    });
    // 首次加载只执行一次；loadQuestion 仅用于补充初始问题。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publishedRevision = useMemo(() => revisions.find((item) => item.status === "published")?.revision ?? null, [revisions]);

  const saveDraft = async (): Promise<void> => {
    let bundle: unknown;
    try { bundle = JSON.parse(bundleText); } catch { setMessage("内容包 JSON 无法解析。"); return; }
    const data = await adminApi<{ revision?: number; issues?: string[] }>("/api/admin/content", {
      method: "POST",
      body: JSON.stringify({ action: "saveDraft", questionId, bundle, changeReason: reason, ticketRef }),
    });
    setMessage(data.ok ? `草稿已保存为 r${data.revision}` : `${data.message ?? "保存失败"}${data.issues?.length ? `：${data.issues.join("；")}` : ""}`);
    if (data.ok) { setReason(""); await loadQuestion(questionId, data.revision); }
  };

  const publish = async (targetRevision: number): Promise<void> => {
    const data = await adminApi("/api/admin/content", { method: "POST", body: JSON.stringify({ action: "publish", questionId, revision: targetRevision }) });
    setMessage(data.ok ? `r${targetRevision} 已发布` : (data.message ?? "发布失败"));
    if (data.ok) await loadQuestion(questionId, targetRevision);
  };

  const compare = async (): Promise<void> => {
    if (left == null || right == null) return;
    const data = await adminApi<{ diff?: typeof diff }>(`/api/admin/content?questionId=${encodeURIComponent(questionId)}&left=${left}&right=${right}`);
    setDiff(data.ok ? data.diff ?? [] : []);
    if (!data.ok) setMessage(data.message ?? "对比失败");
  };

  if (!ready) return <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl"><p className="text-body-md text-muted">正在验证后台身份…</p></main>;

  return (
    <main className="mx-auto max-w-[760px] px-margin-mobile pb-xl pt-xl">
      <header className="flex items-center justify-between gap-md">
        <div><p className="text-micro text-primary">F0344–F0347</p><h1 className="mt-xs text-headline-xl text-ink">申论内容版本</h1><p className="mt-xs text-body-sm text-muted">完整内容包包含材料、任务、字数、Rubric、得分点与范例；已发布版本才进入批改。</p></div>
        <Link href="/admin" className="text-label-md text-primary">返回后台</Link>
      </header>

      <label className="mt-xl block"><span className="text-label-md text-muted">题目</span><select aria-label="申论题目" value={questionId} onChange={(event) => void loadQuestion(event.target.value)} className="mt-xs h-11 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink">{questionIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <div className="mt-md flex flex-wrap gap-sm">{revisions.map((item) => <button key={item.revision} type="button" onClick={() => void loadQuestion(questionId, item.revision)} className={`rounded-full border px-md py-sm text-caption ${revision === item.revision ? "border-primary bg-primary-faint text-primary-active" : "border-border bg-surface text-muted"}`}>r{item.revision} · {item.status}</button>)}</div>

      <label className="mt-lg block"><span className="text-label-md text-muted">完整内容包 JSON（评分点可直接配置）</span><textarea aria-label="申论内容包 JSON" value={bundleText} onChange={(event) => setBundleText(event.target.value)} rows={22} className="mt-xs w-full rounded-md border border-border-strong bg-canvas-warm p-md font-mono text-caption text-ink" /></label>
      <div className="mt-md grid gap-sm sm:grid-cols-2"><input aria-label="变更原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="变更原因（必填）" className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" /><input aria-label="关联工单" value={ticketRef} onChange={(event) => setTicketRef(event.target.value)} placeholder="关联工单（可选）" className="h-11 rounded-sm border border-border-strong bg-surface px-md text-body-sm text-ink" /></div>
      <div className="mt-md flex flex-wrap gap-sm"><ButtonLike disabled={!reason.trim() || !bundleText.trim()} onClick={() => void saveDraft()}>保存草稿</ButtonLike>{revision != null && revision !== publishedRevision ? <ButtonLike onClick={() => void publish(revision)}>发布 r{revision}</ButtonLike> : null}</div>

      <section className="mt-xl rounded-md border border-border bg-surface p-md"><h2 className="text-title-lg text-ink">版本对比（F0344）</h2><div className="mt-sm flex flex-wrap items-center gap-sm"><select aria-label="对比左版本" value={left ?? ""} onChange={(event) => setLeft(Number(event.target.value) || null)} className="h-10 rounded-sm border border-border-strong bg-surface px-sm text-caption text-ink"><option value="">左版本</option>{revisions.map((item) => <option key={item.revision} value={item.revision}>r{item.revision}</option>)}</select><span className="text-caption text-muted">对比</span><select aria-label="对比右版本" value={right ?? ""} onChange={(event) => setRight(Number(event.target.value) || null)} className="h-10 rounded-sm border border-border-strong bg-surface px-sm text-caption text-ink"><option value="">右版本</option>{revisions.map((item) => <option key={item.revision} value={item.revision}>r{item.revision}</option>)}</select><ButtonLike disabled={left == null || right == null} onClick={() => void compare()}>查看差异</ButtonLike></div>{diff.length > 0 ? <ul className="mt-md space-y-sm">{diff.map((item) => <li key={item.field} className="rounded-sm border border-border p-sm text-caption"><strong>{item.field}</strong>：{item.changed ? "已变化" : "未变化"}{item.changed ? <><p className="mt-xs text-muted">前：{item.before.slice(0, 160)}</p><p className="mt-xs text-body">后：{item.after.slice(0, 160)}</p></> : null}</li>)}</ul> : <p className="mt-md text-caption text-muted">选择两个版本查看材料、Rubric、评分点等差异。</p>}</section>
      {message ? <p role="status" className="mt-md rounded-sm bg-surface-soft p-md text-body-sm text-body">{message}</p> : null}
    </main>
  );
}

function ButtonLike({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-sm border border-primary bg-primary px-md py-sm text-button-md text-white disabled:cursor-not-allowed disabled:opacity-50">{children}</button>;
}
