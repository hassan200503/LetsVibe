import type { story } from "@/lib/data";
import { ActionButton, ConfirmButton } from "@/components/ui/forms";
import { deleteMemory, togglePlanDone } from "@/lib/actions/shared";
import { storyKindMeta } from "@/lib/story/kinds";
import { day } from "@/lib/ui/time";

type StoryRow = Awaited<ReturnType<typeof story>>[number];

/** One entry in Our Story, always stamped with the category it was filed under. */
export function StoryEntry({ row }: { row: StoryRow }) {
  const { m, by, byTheme, sourceUrl, sourceName } = row;
  const meta = storyKindMeta(m.kind);
  const isPlan = m.kind === "plan";
  const done = isPlan && m.planDone;
  const first = by.split(" ")[0];

  return (
    <article className="card card-hover overflow-hidden">
      {m.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.photoUrl} alt="" loading="lazy" className="max-h-80 w-full bg-surface-2 object-cover" />
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`chip ${done ? "chip-quiet" : ""}`}>
              <span aria-hidden>{meta.icon}</span> {meta.label}
              {done ? " · done" : ""}
            </span>
            <h3 className={`font-display mt-1.5 min-w-0 text-lg font-semibold leading-snug ${done ? "line-through opacity-60" : ""}`}>{m.title}</h3>
          </div>
          <ConfirmButton onConfirm={deleteMemory.bind(null, m.id)} question="Remove this from our story?" label="Remove" className="-mr-1.5 shrink-0" />
        </div>
        <p className="type-meta mt-1 flex flex-wrap items-center gap-x-1.5">
          <span>{isPlan && !done ? `Planned for ${day(m.occurredOn)}` : day(m.occurredOn)}</span>
          {m.place && <span>· {m.place}</span>}
          <span>
            · added by <span data-world={byTheme} className="font-semibold text-accent">{first}</span>
          </span>
        </p>
        {m.why && (
          <p className="mt-3 text-sm">
            <span className="font-semibold">{m.kind === "discovery" ? `Why it caught ${first}'s eye` : "Why it matters"}: </span>
            {m.why}
          </p>
        )}
        {m.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/85">{m.body}</p>}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-8 items-center text-sm font-semibold text-accent hover:underline">
            From {sourceName ?? "the web"} →
          </a>
        )}
        {isPlan && (
          <ActionButton onClick={togglePlanDone.bind(null, m.id)} className="btn btn-ghost mt-3 px-3 py-1 text-xs">
            {done ? "Move back to ahead" : "We did it ✓"}
          </ActionButton>
        )}
      </div>
    </article>
  );
}
