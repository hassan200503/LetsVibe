import { formatBytes, percent } from "@/lib/entitlements/format";

export function UsageMeter({
  label,
  used,
  limit,
  kind = "count",
  hint,
  compact = false,
  blocked,
}: {
  label: string;
  used: number;
  limit: number;
  kind?: "bytes" | "count";
  hint?: string;
  compact?: boolean;
  blocked?: boolean;
}) {
  const ratio = percent(used, limit);
  const full = blocked ?? (limit <= 0 || used >= limit);
  const near = !full && ratio >= 80;
  const value = limit <= 0 ? "Not included" : kind === "bytes" ? `${formatBytes(used)} of ${formatBytes(limit)}` : `${used} of ${limit}`;
  return (
    <div className={compact ? "" : "rounded-xl border border-line/70 bg-surface-2/40 p-3.5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>{label}</span>
        <span className="text-xs tabular-nums text-muted">{value}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70"
        role="progressbar"
        aria-label={`${label}: ${value}`}
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${full ? "bg-red-500" : near ? "bg-gold" : "bg-accent"}`} style={{ width: `${Math.max(2, ratio)}%` }} />
      </div>
      {hint && <p className="mt-1.5 text-[0.7rem] leading-snug text-muted">{hint}</p>}
    </div>
  );
}
