const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes >= GB) {
    const value = bytes / GB;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")} GB`;
  }
  if (bytes >= MB) return `${Math.max(1, Math.round(bytes / MB))} MB`;
  return `${Math.max(1, Math.round(bytes / KB))} KB`;
}

export function percent(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function resetLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
}

export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(tokens >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(Math.round(tokens));
}

export function formatCost(micros: number): string {
  if (!Number.isFinite(micros) || micros <= 0) return "$0.00";
  const usd = micros / 1_000_000;
  return usd < 0.01 ? "under $0.01" : `$${usd.toFixed(2)}`;
}
