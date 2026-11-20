"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { noteOnDiscovery, saveToStory, saveToVault, toggleReaction } from "@/lib/actions/shared";
import type { TrendCard } from "@/lib/trends/query";
import { useMe, useMembers } from "@/components/me-context";
import { isoDay } from "@/lib/ui/time";
import { IconAlert, IconBookmark, IconBookmarkFilled, IconHeart, IconHeartFilled, IconMessage, IconMore, IconShare, IconStar, IconStarFilled } from "@/components/icons";

const KINDS = [
  { kind: "save", label: "Save to Our Story" },
  { kind: "favorite", label: "Favourite" },
  { kind: "bookmark", label: "Bookmark" },
] as const;

function StoryDialog({ item, open, onClose }: { item: TrendCard; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveToStory, null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 900);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      data-world="us"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-[24px] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-sheet)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form action={action} className="p-5 sm:p-6">
        <p className="eyebrow">Save to Our Story</p>
        <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug [overflow-wrap:anywhere]">{item.title}</h2>
        <input type="hidden" name="trendId" value={item.id} />
        <label className="mt-4 block text-sm font-semibold" htmlFor={`why-${item.id}`}>
          Why did it catch your eye?
        </label>
        <textarea id={`why-${item.id}`} name="why" className="field mt-1" placeholder="It reminded me of…" />
        <label className="mt-3 block text-sm font-semibold" htmlFor={`note-${item.id}`}>
          A note for us <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id={`note-${item.id}`} name="note" className="field mt-1 min-h-16" />
        <label className="mt-3 block text-sm font-semibold" htmlFor={`date-${item.id}`}>
          Date
        </label>
        <input id={`date-${item.id}`} type="date" name="occurredOn" defaultValue={isoDay()} className="field mt-1" />
        {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="mt-2 text-sm text-accent">{state.message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : "Keep this memory"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function Reactions({ item }: { item: TrendCard }) {
  const me = useMe();
  const members = useMembers();
  const [mine, setMine] = useState<string[]>(item.reactions[me.slug] ?? []);
  const [pending, start] = useTransition();
  const [story, setStory] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const partners = Object.entries(item.reactions).filter(([slug]) => slug !== me.slug);

  function toggle(kind: string) {
    const was = mine.includes(kind);
    setMine((m) => (was ? m.filter((k) => k !== kind) : [...m, kind]));
    start(async () => {
      try {
        const { on } = await toggleReaction(item.id, kind);
        setMine((m) => (on ? [...new Set([...m, kind])] : m.filter((k) => k !== kind)));
      } catch {
        setMine((m) => (was ? [...m, kind] : m.filter((k) => k !== kind)));
        setFlash("Couldn't save — try again");
      }
    });
  }

  async function share() {
    const data = { title: item.title, text: `${item.title} — ${item.sourceName}`, url: item.sourceUrl };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(item.sourceUrl);
        setFlash("Link copied");
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const icon = (kind: string, on: boolean, size = 18) => {
    if (kind === "save") return on ? <IconHeartFilled size={size} /> : <IconHeart size={size} />;
    if (kind === "favorite") return on ? <IconStarFilled size={size} /> : <IconStar size={size} />;
    return on ? <IconBookmarkFilled size={size} /> : <IconBookmark size={size} />;
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-0.5" aria-busy={pending}>
        {KINDS.map((k) => {
          const on = mine.includes(k.kind);
          return (
            <button
              key={k.kind}
              type="button"
              aria-pressed={on}
              aria-label={k.label}
              title={k.label}
              onClick={() => toggle(k.kind)}
              className={`grid size-9 place-items-center rounded-full transition active:scale-90 ${
                on ? (k.kind === "favorite" ? "text-gold-ink" : "text-accent") : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className={on ? "motion-safe:animate-[heart-pop_260ms_ease-out]" : undefined}>{icon(k.kind, on)}</span>
            </button>
          );
        })}
        <button type="button" aria-label="Add a note" title="Add a note" onClick={() => setNoting((v) => !v)} aria-pressed={noting} className={`grid size-9 place-items-center rounded-full transition active:scale-90 ${noting ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
          <IconMessage size={18} />
        </button>
        <button type="button" aria-label="Share" title="Share" onClick={share} className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-90">
          <IconShare size={17} />
        </button>
        <details className="relative">
          <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden" aria-label="More actions">
            <IconMore size={18} />
          </summary>
          <div className="absolute bottom-10 right-0 z-10 w-56 rounded-[14px] border border-line bg-surface p-1 text-sm shadow-[var(--shadow-pop)]">
            <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2" onClick={() => setStory(true)}>
              <IconHeart size={16} className="text-accent" /> Save to Our Story
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2"
              onClick={() => start(async () => setFlash((await saveToVault(item.id))?.message ?? null))}
            >
              <IconBookmark size={16} className="text-gold-ink" /> Add to my Knowledge Vault
            </button>
          </div>
        </details>
      </div>
      {partners.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {partners.some(([, kinds]) => kinds.includes("favorite")) ? <IconStarFilled size={12} className="text-gold-ink" /> : <IconHeartFilled size={12} className="text-accent" />}
          {partners
            .map(([slug, kinds]) => {
              const who = members.find((m) => m.slug === slug)?.displayName.split(" ")[0] ?? `${slug[0].toUpperCase()}${slug.slice(1)}`;
              return `${who} ${kinds.includes("favorite") ? "loved" : "saved"} this`;
            })
            .join(" · ")}
        </p>
      )}
      {noting && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await noteOnDiscovery(item.id, note);
              setMine((m) => [...new Set([...m, "save"])]);
              setFlash(r?.message ?? null);
              setNoting(false);
            });
          }}
        >
          <input value={note} onChange={(e) => setNote(e.target.value)} className="field text-sm" placeholder="A thought about this…" aria-label="Note" />
          <button className="btn shrink-0 px-3.5">Save</button>
        </form>
      )}
      {flash && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-accent">
          {flash.includes("Couldn't") && <IconAlert size={12} />}
          {flash}
        </p>
      )}
      <StoryDialog item={item} open={story} onClose={() => setStory(false)} />
    </div>
  );
}
