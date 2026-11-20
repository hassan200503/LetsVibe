"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaCard } from "@/lib/media/queries";
import { markGallerySeen } from "@/lib/actions/media";
import { DISCOVER_CATEGORIES, isDiscoverCategory, type DiscoverCategory } from "@/lib/media/youtube";
import { Avatar } from "@/components/avatar";
import { useMembers } from "@/components/me-context";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCamera, IconX } from "@/components/icons";
import { Viewer } from "./viewer";

const TABS = [
  { k: null, label: "Everything", icon: "✨" },
  { k: "photo", label: "Photos", icon: "📸" },
  { k: "video", label: "Videos", icon: "🎬" },
  { k: "song", label: "Songs", icon: "🎵" },
] as const;

const SHELF_EMOJI: Record<DiscoverCategory, string> = {
  movies: "🎬",
  music: "🎵",
  shorts: "⚡",
  animation: "🎨",
  news: "📰",
};

const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

type Page = { items: MediaCard[]; nextCursor: string | null };

function Tile({ item, onOpen }: { item: MediaCard; onOpen: () => void }) {
  const members = useMembers();
  const who = members.find((m) => m.slug === item.by.slug);
  const [loaded, setLoaded] = useState(false);
  const reactions = Object.values(item.reactions);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-square w-full overflow-hidden rounded-[14px] bg-surface-2 text-left outline-offset-2 transition-shadow hover:shadow-[var(--shadow-pop)] focus-visible:ring-2 focus-visible:ring-accent sm:rounded-[16px]"
      aria-label={`Open ${item.kind}${item.title ? `: ${item.title}` : ""}`}
    >
      {item.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed private thumbnails, already 480px
        <img
          src={item.thumbUrl}
          alt={item.caption ?? item.title ?? ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`size-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.04] ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <span data-world={item.by.theme} className="grid size-full place-items-center bg-gradient-to-br from-accent to-accent-2 text-5xl text-white">
          {item.kind === "song" ? "♪" : item.kind === "video" ? "▶" : "📷"}
        </span>
      )}
      {!loaded && item.thumbUrl && <span className="skeleton absolute inset-0 rounded-none" />}
      <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/10 opacity-90" />
      {item.kind !== "photo" && (
        <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-base text-black shadow-lg backdrop-blur-sm transition motion-safe:group-hover:scale-110">
          {item.kind === "song" ? "♪" : "▶"}
        </span>
      )}
      {item.isNew && (
        <span data-world="us" className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-accent-ink shadow-sm">
          New
        </span>
      )}
      <span className="absolute right-2 top-2">{who && <Avatar name={who.displayName} url={who.avatarUrl} theme={who.theme} size={26} className="drop-shadow" />}</span>
      <span className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2 text-white">
        <span className="min-w-0 text-xs font-semibold leading-tight drop-shadow">
          {item.kind === "song" ? <span className="line-clamp-2">{item.title ?? "Song"}</span> : item.caption ? <span className="line-clamp-2">{item.caption}</span> : null}
        </span>
        <span className="shrink-0 text-[0.7rem] drop-shadow">
          {reactions.join("")}
          {item.comments > 0 && ` 💬${item.comments}`}
          {item.durationSec ? ` ${fmt(item.durationSec)}` : ""}
        </span>
      </span>
    </button>
  );
}

export function GalleryGrid({
  initialKind,
  initialCollection,
  initialSource,
  initialPage,
  showHeading = true,
}: {
  initialKind?: string | null;
  initialCollection?: string | null;
  initialSource?: string | null;
  initialPage?: Page;
  showHeading?: boolean;
}) {
  const members = useMembers();
  const qc = useQueryClient();
  const startKind = initialKind ?? null;
  const startCollection = isDiscoverCategory(initialCollection) ? initialCollection : null;
  const startSource = initialSource === "youtube" || initialSource === "upload" ? initialSource : null;
  const [kind, setKind] = useState<string | null>(startKind);
  const [by, setBy] = useState<string | null>(null);
  const [collection, setCollection] = useState<DiscoverCategory | null>(startCollection);
  const [source, setSource] = useState<"youtube" | "upload" | null>(startSource);
  const [open, setOpen] = useState<number | null>(null);

  // The server already rendered one page for exactly this filter set; reuse it.
  const isServerView = kind === startKind && by === null && collection === startCollection && source === startSource;

  const q = useInfiniteQuery({
    queryKey: ["gallery", kind, by, collection, source],
    queryFn: async ({ pageParam, signal }) => {
      const qs = new URLSearchParams();
      if (kind) qs.set("kind", kind);
      if (by) qs.set("by", by);
      if (collection) qs.set("collection", collection);
      if (source) qs.set("source", source);
      if (pageParam) qs.set("cursor", pageParam);
      const res = await fetch(`/api/gallery?${qs}`, { signal });
      if (!res.ok) throw new Error("Couldn't load the gallery");
      return (await res.json()) as Page;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: isServerView && initialPage ? { pages: [initialPage], pageParams: [null] } : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  // Opening the gallery counts as having seen what's new (after a moment, so the badges are visible first).
  useEffect(() => {
    const t = setTimeout(() => {
      void markGallerySeen();
      void qc.invalidateQueries({ queryKey: ["gallery-stats"] });
    }, 4000);
    return () => clearTimeout(t);
  }, [qc]);

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const extraFilter = collection || source;

  return (
    <section aria-labelledby={showHeading ? "shared-gallery-title" : undefined} aria-label={showHeading ? undefined : "Shared gallery"}>
      {showHeading && (
        <div className="mb-4">
          <h2 id="shared-gallery-title" className="font-display text-xl font-semibold tracking-tight">
            Shared gallery
          </h2>
          <p className="mt-0.5 text-xs text-muted">Every photo, video and song you&apos;ve shared — newest first.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="segmented max-w-full overflow-x-auto no-scrollbar" role="group" aria-label="Filter by kind">
          {TABS.map((t) => (
            <button key={t.label} onClick={() => setKind(t.k)} className="seg-tab" aria-pressed={kind === t.k}>
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />
        <div className="segmented max-w-full overflow-x-auto no-scrollbar" role="group" aria-label="Filter by person">
          <button onClick={() => setBy(null)} className="seg-tab" aria-pressed={!by}>
            Both of us
          </button>
          {members.map((m) => (
            <button key={m.slug} onClick={() => setBy(m.slug)} className="seg-tab gap-1.5" aria-pressed={by === m.slug}>
              <Avatar name={m.displayName} url={m.avatarUrl} theme={m.theme} size={18} /> {m.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {extraFilter && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {collection && (
            <button type="button" className="chip" onClick={() => setCollection(null)} aria-label={`Clear ${DISCOVER_CATEGORIES[collection].label} filter`}>
              <span aria-hidden>{SHELF_EMOJI[collection]}</span> {DISCOVER_CATEGORIES[collection].label}
              <IconX size={12} />
            </button>
          )}
          {source && (
            <button type="button" className="chip" onClick={() => setSource(null)} aria-label={`Clear ${source === "youtube" ? "YouTube" : "uploaded"} filter`}>
              {source === "youtube" ? "From YouTube" : "Uploaded by us"}
              <IconX size={12} />
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <Tile key={it.id} item={it} onOpen={() => setOpen(i)} />
        ))}
        {(q.isPending || isFetchingNextPage) && Array.from({ length: q.isPending ? 8 : 4 }, (_, i) => <div key={i} className="skeleton aspect-square rounded-[14px] sm:rounded-[16px]" />)}
      </div>
      {q.isSuccess && items.length === 0 && !extraFilter && (
        <EmptyState className="mt-4" icon={<IconCamera size={20} />} title="Your gallery is waiting for its first memory">
          A selfie, a voice note, a song that reminds you of each other — whatever you share appears here for both of you.
        </EmptyState>
      )}
      {q.isSuccess && items.length === 0 && extraFilter && (
        <div className="card mt-4 flex flex-wrap items-center justify-center gap-3 px-6 py-5 text-center text-sm text-muted">
          Nothing in this filter yet.
          <button
            className="btn btn-ghost"
            onClick={() => {
              setCollection(null);
              setSource(null);
              setKind(null);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {q.isError && (
        <div className="card mt-4 flex flex-wrap items-center justify-center gap-3 px-6 py-5 text-center text-sm text-muted">
          Couldn&apos;t load the gallery just now.
          <button className="btn btn-ghost" onClick={() => q.refetch()}>
            Try again
          </button>
        </div>
      )}
      <div ref={sentinel} className="h-px" />

      {open !== null && items[open] && (
        <Viewer
          items={items}
          index={open}
          onIndex={(i) => {
            setOpen(i);
            if (i >= items.length - 3 && hasNextPage) fetchNextPage();
          }}
          onClose={() => setOpen(null)}
          onChanged={() => {
            void q.refetch();
            void qc.invalidateQueries({ queryKey: ["gallery-stats"] });
          }}
        />
      )}
    </section>
  );
}
