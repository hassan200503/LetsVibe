"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { GalleryStats } from "@/lib/media/queries";
import { DISCOVER_CATEGORIES, DISCOVER_ORDER, type DiscoverCategory } from "@/lib/media/youtube";
import { ago } from "@/lib/ui/time";
import { IconArrowRight } from "@/components/icons";

const EMOJI: Record<DiscoverCategory, string> = {
  movies: "🎬",
  music: "🎵",
  shorts: "⚡",
  animation: "🎨",
  news: "📰",
};

function Count({ value }: { value: number }) {
  return <span className="tabular-nums">{value}</span>;
}

/**
 * The gallery at a glance: real counts by kind and by YouTube shelf, with one
 * tap into the full gallery. Updated optimistically after every add.
 */
export function GallerySummary({ initial }: { initial: GalleryStats }) {
  const q = useQuery<GalleryStats>({
    queryKey: ["gallery-stats"],
    queryFn: async () => {
      const res = await fetch("/api/gallery/stats");
      if (!res.ok) throw new Error("Couldn't load the gallery summary");
      return (await res.json()) as GalleryStats;
    },
    initialData: initial,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
  const stats = q.data;
  const shelves = DISCOVER_ORDER.filter((key) => stats.shelves[key] > 0);
  const last = stats.latestAt;

  return (
    <section aria-labelledby="gallery-summary-title" data-world="us" className="card bg-us relative overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Shared gallery</p>
            {stats.unseen > 0 && (
              <span className="chip px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">
                {stats.unseen} new
              </span>
            )}
          </div>
          <h2 id="gallery-summary-title" className="font-display mt-2 flex items-baseline gap-2.5 text-3xl font-semibold tracking-tight">
            <Count value={stats.total} />
            <span className="text-sm font-normal text-muted">{stats.total === 1 ? "memory" : "memories"}</span>
          </h2>
          <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
            {last ? `Last added ${ago(last)}` : "Nothing yet — add the first memory below."}
            {stats.total > 0 && (
              <>
                {" · "}
                <Count value={stats.uploads} /> uploaded · <Count value={stats.youtube} /> from YouTube
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Link href="/gallery/all?kind=photo" className={`chip ${stats.photos ? "" : "chip-outline opacity-60"}`}>
              📸 Pictures <Count value={stats.photos} />
            </Link>
            <Link href="/gallery/all?kind=video" className={`chip ${stats.videos ? "" : "chip-outline opacity-60"}`}>
              🎬 Videos <Count value={stats.videos} />
            </Link>
            <Link href="/gallery/all?kind=song" className={`chip ${stats.songs ? "" : "chip-outline opacity-60"}`}>
              🎵 Songs <Count value={stats.songs} />
            </Link>
            {stats.youtube > 0 && (
              <Link href="/gallery/all?source=youtube" className="chip chip-outline">
                ▶ From YouTube <Count value={stats.youtube} />
              </Link>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.7rem] text-muted">
            <span className="shrink-0">Saved from shelves:</span>
            {DISCOVER_ORDER.map((key) => (
              <Link
                key={key}
                href={`/gallery/all?collection=${key}`}
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition hover:bg-surface-2 hover:text-ink ${shelves.includes(key) ? "text-ink" : "opacity-55"}`}
                aria-label={`Open ${DISCOVER_CATEGORIES[key].label} in the shared gallery`}
              >
                <span aria-hidden>{EMOJI[key]}</span> {DISCOVER_CATEGORIES[key].label} <Count value={stats.shelves[key]} />
              </Link>
            ))}
          </div>
        </div>

        <Link href="/gallery/all" className="btn btn-lg group shrink-0">
          Open the shared gallery
          <IconArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
