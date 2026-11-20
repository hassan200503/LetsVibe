import "server-only";
import { unstable_cache } from "next/cache";
import { DISCOVER_CATEGORIES, parseIsoDuration, youtubeThumb, type DiscoverCategory, type DiscoverItem, type DiscoverPage } from "./youtube";

/**
 * Live YouTube discovery through the official Data API.
 *
 * Speed is the feature here:
 *  - Search results come back in one upstream call. Duration and view counts
 *    are a second, optional request (`videoDetails`) so cards paint sooner.
 *  - Only the fields we render are requested, and thumbnails are built from
 *    the video id (mqdefault, ~15 KB) instead of shipping thumbnail JSON.
 *  - Results are cached globally for 30 minutes, so both people — and every
 *    other couple — share one upstream call. Repeat visits are instant.
 */

const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 6_000;
const SHELF_PAGE_SIZE = 12;
const SEARCH_PAGE_SIZE = 24;

const SEARCH_FIELDS = "nextPageToken,items(id/videoId,snippet(title,channelId,channelTitle,publishedAt,liveBroadcastContent))";
const DETAIL_FIELDS = "items(id,contentDetails(duration),statistics(viewCount),status(embeddable,privacyStatus),snippet(categoryId))";

export type DiscoveryFailure = "unconfigured" | "quota" | "upstream";

export class DiscoveryError extends Error {
  readonly reason: DiscoveryFailure;
  readonly status: number;

  constructor(reason: DiscoveryFailure, status = 0) {
    super(reason);
    this.name = "DiscoveryError";
    this.reason = reason;
    this.status = status;
  }
}

export const youtubeDiscoveryConfigured = () => (process.env.YOUTUBE_API_KEY ?? "").trim().length > 0;

const apiKey = () => (process.env.YOUTUBE_API_KEY ?? "").trim();
const regionCode = () => (process.env.YOUTUBE_REGION_CODE ?? "").trim() || "KE";

async function call<T>(resource: string, params: Record<string, string>): Promise<T> {
  const key = apiKey();
  if (!key) throw new DiscoveryError("unconfigured");
  const url = new URL(`${API}/${resource}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new DiscoveryError("upstream");
  }

  if (!res.ok) {
    let reason: DiscoveryFailure = res.status === 403 || res.status === 429 ? "quota" : "upstream";
    try {
      const body = (await res.json()) as { error?: { errors?: { reason?: string }[] } };
      const why = body.error?.errors?.[0]?.reason;
      if (why === "quotaExceeded" || why === "dailyLimitExceeded" || why === "rateLimitExceeded") reason = "quota";
      if (why === "keyInvalid" || why === "accessNotConfigured" || why === "ipRefererBlocked") reason = "unconfigured";
    } catch {
      // Keep the status-based reason.
    }
    throw new DiscoveryError(reason, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new DiscoveryError("upstream");
  }
}

type SearchResponse = {
  nextPageToken?: string;
  items?: {
    id?: { kind?: string; videoId?: string };
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      liveBroadcastContent?: string;
    };
  }[];
};

function toPage(search: SearchResponse): DiscoverPage {
  const seen = new Set<string>();
  const items: DiscoverItem[] = [];
  for (const entry of search.items ?? []) {
    const videoId = entry.id?.videoId;
    const s = entry.snippet;
    if (!videoId || !s || seen.has(videoId) || s.liveBroadcastContent === "upcoming") continue;
    seen.add(videoId);
    items.push({
      videoId,
      title: s.title ?? "Untitled video",
      channel: s.channelTitle ?? "",
      channelId: s.channelId ?? null,
      publishedAt: s.publishedAt ?? "",
      thumb: youtubeThumb(videoId, "mq"),
      durationSec: null,
      viewCount: null,
    });
  }
  return { items, nextPageToken: search.nextPageToken ?? null };
}

async function fetchShelfPage(category: DiscoverCategory, pageToken: string | null): Promise<DiscoverPage> {
  const cfg = DISCOVER_CATEGORIES[category];
  const search = await call<SearchResponse>("search", {
    part: "snippet",
    type: "video",
    q: cfg.query,
    maxResults: String(SHELF_PAGE_SIZE),
    order: cfg.order,
    safeSearch: "moderate",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    regionCode: regionCode(),
    relevanceLanguage: "en",
    fields: SEARCH_FIELDS,
    ...(cfg.videoCategoryId ? { videoCategoryId: cfg.videoCategoryId } : {}),
    ...(cfg.videoDuration ? { videoDuration: cfg.videoDuration } : {}),
    ...(pageToken ? { pageToken } : {}),
  });
  return toPage(search);
}

async function fetchSearchPage(query: string, pageToken: string | null): Promise<DiscoverPage> {
  const search = await call<SearchResponse>("search", {
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(SEARCH_PAGE_SIZE),
    order: "relevance",
    safeSearch: "moderate",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    regionCode: regionCode(),
    relevanceLanguage: "en",
    fields: SEARCH_FIELDS,
    ...(pageToken ? { pageToken } : {}),
  });
  return toPage(search);
}

export const discoverPage = unstable_cache(fetchShelfPage, ["youtube-shelf-v2"], {
  revalidate: 30 * 60,
  tags: ["youtube-discover"],
});

export const searchPage = unstable_cache(fetchSearchPage, ["youtube-search-v2"], {
  revalidate: 30 * 60,
  tags: ["youtube-search"],
});

export type VideoDetail = {
  videoId: string;
  durationSec: number | null;
  viewCount: number | null;
  categoryId: string | null;
  /** False means the uploader disabled embedding; the card can disappear. */
  embeddable: boolean | null;
};

type DetailsResponse = {
  items?: {
    id?: string;
    contentDetails?: { duration?: string };
    statistics?: { viewCount?: string };
    status?: { embeddable?: boolean; privacyStatus?: string };
    snippet?: { categoryId?: string };
  }[];
};

async function fetchDetails(idsKey: string): Promise<VideoDetail[]> {
  const ids = idsKey.split(",").filter(Boolean);
  if (!ids.length) return [];
  const details = await call<DetailsResponse>("videos", {
    part: "contentDetails,statistics,status,snippet",
    id: ids.join(","),
    maxResults: String(ids.length),
    fields: DETAIL_FIELDS,
  });
  const out: VideoDetail[] = [];
  for (const d of details.items ?? []) {
    if (!d.id) continue;
    const views = Number(d.statistics?.viewCount);
    out.push({
      videoId: d.id,
      durationSec: d.contentDetails?.duration ? parseIsoDuration(d.contentDetails.duration) : null,
      viewCount: Number.isFinite(views) && views > 0 ? views : null,
      categoryId: d.snippet?.categoryId ?? null,
      embeddable: d.status?.privacyStatus === "private" ? false : d.status?.embeddable === false ? false : d.status?.embeddable === true ? true : null,
    });
  }
  return out;
}

/** Duration, views and embeddability for the cards already on screen. */
export const videoDetails = unstable_cache(fetchDetails, ["youtube-details-v2"], {
  revalidate: 30 * 60,
  tags: ["youtube-details"],
});
