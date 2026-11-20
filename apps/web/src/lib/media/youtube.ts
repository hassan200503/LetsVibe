/** Pulls the 11-character video id out of any common YouTube / YouTube Music link. */
export function youtubeIdFrom(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") return valid(u.pathname.slice(1));
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return valid(u.searchParams.get("v")!);
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

const valid = (id: string) => (/^[\w-]{11}$/.test(id) ? id : null);

export const youtubeThumb = (id: string, quality: "hq" | "mq" | "maxres" = "hq") => `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;

/**
 * The five live shelves on the gallery's YouTube panel. Every result is
 * filtered to public, embeddable videos server-side, so anything shown here
 * can be added and played inside Lovora.
 */
export type DiscoverCategory = "movies" | "music" | "shorts" | "animation" | "news";

export type DiscoverShelf = {
  label: string;
  query: string;
  videoCategoryId?: string;
  videoDuration?: "short" | "medium" | "long";
  order: "date" | "relevance";
};

export const DISCOVER_CATEGORIES: Record<DiscoverCategory, DiscoverShelf> = {
  movies: { label: "Movies", query: "full movie", videoCategoryId: "1", videoDuration: "long", order: "relevance" },
  music: { label: "Music", query: "official music video", videoCategoryId: "10", order: "relevance" },
  shorts: { label: "Shorts", query: "#shorts", videoDuration: "short", order: "relevance" },
  animation: { label: "Animation", query: "animated short film", videoCategoryId: "1", videoDuration: "short", order: "relevance" },
  news: { label: "News", query: "news", videoCategoryId: "25", order: "date" },
};

export const DISCOVER_ORDER: DiscoverCategory[] = ["movies", "music", "shorts", "animation", "news"];

export function isDiscoverCategory(value: unknown): value is DiscoverCategory {
  return typeof value === "string" && value in DISCOVER_CATEGORIES;
}

/** YouTube treats whitespace as a new search; keep one canonical form for cache hits. */
export const SEARCH_QUERY_MAX = 100;

export function normalizeSearchQuery(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const q = input.replace(/\s+/g, " ").trim();
  if (q.length < 2 || q.length > SEARCH_QUERY_MAX) return null;
  return q;
}

export type DiscoverItem = {
  videoId: string;
  title: string;
  channel: string;
  channelId: string | null;
  publishedAt: string;
  thumb: string;
  durationSec: number | null;
  viewCount: number | null;
};

export type DiscoverPage = { items: DiscoverItem[]; nextPageToken: string | null };

/** ISO-8601 durations from videos.list (`PT1H2M3S`) to seconds. */
export function parseIsoDuration(iso: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso.trim());
  if (!m) return null;
  const [, d, h, min, s] = m;
  if (d === undefined && h === undefined && min === undefined && s === undefined) return null;
  const total = Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3_600 + Number(min ?? 0) * 60 + Number(s ?? 0);
  return Number.isFinite(total) ? Math.round(total) : null;
}
