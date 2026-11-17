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
