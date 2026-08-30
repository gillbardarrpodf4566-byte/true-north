/**
 * 横向贡献条 — §13.2 preferred charts（horizontal bars），替代雷达图。
 * §16.5：图表必须提供标题、当前值、变化方向与可访问数据表替代。
 */
export interface ContributionRow {
  label: string;
  /** 归一化 0–1 的条长 */
  value: number;
  /** 展示用文本，如「+6.0 分」 */
  valueText: string;
  /** 是否为机会点（dawn，§13.4） */
  highlight?: boolean;
}

export function ContributionBars({
  title,
  rows,
  caption,
}: {
  title: string;
  rows: ContributionRow[];
  caption?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <figure className="rounded-lg border border-border bg-surface p-lg">
      <figcaption className="text-title-md text-ink">{title}</figcaption>
      {caption ? <p className="mt-xs text-caption text-muted">{caption}</p> : null}
      <ul className="mt-lg space-y-md">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-body-sm text-body">{r.label}</span>
              <span className="text-label-md text-muted">{r.valueText}</span>
            </div>
            <div className="mt-xs h-2 w-full rounded-full bg-surface-strong">
              <div
                className={`h-full rounded-full ${r.highlight ? "bg-dawn" : "bg-primary"}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {/* 可访问数据表替代（§16.5） */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">项目</th>
            <th scope="col">数值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.valueText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
