/**
 * 段式进度（§11.1：顶部显示 4–5 段进度而非「17%」）与 §7.15 progress-track。
 */
export function SegmentProgress({
  total,
  current,
  label,
}: {
  total: number;
  current: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-xs" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-label={label ?? "步骤进度"}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-surface-strong"}`}
        />
      ))}
    </div>
  );
}

export function ProgressTrack({ value, label }: { value: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-strong"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}
