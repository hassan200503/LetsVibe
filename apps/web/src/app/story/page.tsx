import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { story } from "@/lib/data";
import { addMemory } from "@/lib/actions/shared";
import { ActionForm, Field } from "@/components/ui/forms";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { Container, PageHeader } from "@/components/ui/page-header";
import { StoryEntry } from "@/components/story/story-entry";
import { IconPlus, IconSparkle } from "@/components/icons";
import { groupByMonth, isStoryKind, STORY_KINDS, storyKindCounts, storyKindMeta, type StoryKind } from "@/lib/story/kinds";
import { isoDay } from "@/lib/ui/time";

export const metadata = { title: "Our Story" };

const EMPTY: Record<StoryKind, { title: string; body: string; action: string; href: string }> = {
  memory: {
    title: "No memories here yet",
    body: "A day you want to keep forever starts with one line.",
    action: "Add a memory",
    href: "/story?kind=memory#add",
  },
  milestone: {
    title: "No milestones here yet",
    body: "The steps that changed us — big, quiet, or somewhere in between.",
    action: "Add a milestone",
    href: "/story?kind=milestone#add",
  },
  adventure: {
    title: "No adventures here yet",
    body: "Somewhere you went together, or something you tried for the first time.",
    action: "Log an adventure",
    href: "/story?kind=adventure#add",
  },
  plan: {
    title: "Nothing planned yet",
    body: "Trips, dates, someday-things — write the first one down and it will wait in “Still ahead”.",
    action: "Plan something",
    href: "/story?kind=plan#add",
  },
  discovery: {
    title: "No discoveries here yet",
    body: "Tap “Save to Our Story” on anything that catches your eye in Discover, and it will land here.",
    action: "Find a discovery",
    href: "/discover",
  },
};

function KindEmpty({ kind, className = "" }: { kind: StoryKind; className?: string }) {
  const meta = storyKindMeta(kind);
  const copy = EMPTY[kind];
  return (
    <EmptyState
      className={className}
      icon={<span aria-hidden className="text-xl">{meta.icon}</span>}
      title={copy.title}
      action={<Link href={copy.href} className="btn">{copy.action}</Link>}
    >
      {copy.body}
    </EmptyState>
  );
}

function PlanList({ rows, label, count }: { rows: Awaited<ReturnType<typeof story>>; label: string; count: string }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-section-title font-display">{label}</h2>
        <span className="type-meta">{count}</span>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.m.id} className="min-w-0">
            <StoryEntry row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function StoryPage({ searchParams }: PageProps<"/story">) {
  const ctx = await requireCtx();
  const { kind } = await searchParams;
  const active = isStoryKind(kind) ? kind : null;
  const rows = await story(ctx);

  // Plans live in their own board; everything else shares one categorized timeline.
  const plans = rows.filter((r) => r.m.kind === "plan");
  const ahead = plans.filter((r) => !r.m.planDone).sort((a, b) => a.m.occurredOn.localeCompare(b.m.occurredOn));
  const achieved = plans.filter((r) => r.m.planDone);
  const lived = rows.filter((r) => r.m.kind !== "plan");
  const visible = active && active !== "plan" ? lived.filter((r) => storyKindMeta(r.m.kind).kind === active) : lived;
  const counts = storyKindCounts(rows.map((r) => r.m.kind));
  const filtered = active && active !== "plan" ? storyKindMeta(active) : null;
  const groups = groupByMonth(visible, (r) => r.m.occurredOn);
  const defaultKind = active ?? "memory";
  const hasPlans = plans.length > 0;

  const tabs: { key: StoryKind | null; label: string; icon?: string; count: number }[] = [
    { key: null, label: "Everything", count: rows.length },
    ...STORY_KINDS.map((k) => ({ key: k.kind, label: k.plural, icon: k.icon, count: counts[k.kind] })),
  ];

  return (
    <>
      <PageHeader
        world="us"
        eyebrow="Our Story"
        title="Everything we've lived, and everything ahead"
        actions={
          <Link href="#add" className="btn btn-lg">
            <IconPlus size={16} /> Add to our story
          </Link>
        }
      >
        Five kinds of pages in one story — memories, milestones and adventures we&apos;ve lived, discoveries we saved to share, and the plans still ahead of us.
      </PageHeader>
      <Container world="us">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6" role="tablist" aria-label="Filter the story">
              {tabs.map((t) => {
                const selected = active === t.key;
                return (
                  <Link
                    key={t.label}
                    href={t.key ? `/story?kind=${t.key}` : "/story"}
                    role="tab"
                    aria-selected={selected}
                    aria-current={selected ? "page" : undefined}
                    aria-label={`${t.label}: ${t.count}`}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
                      selected ? "border-transparent bg-accent text-accent-ink shadow-[var(--shadow-hairline)]" : "border-line bg-surface text-muted hover:border-ink/20 hover:text-ink"
                    }`}
                  >
                    {t.icon && <span aria-hidden>{t.icon}</span>}
                    {t.label}
                    <span className={`text-xs font-semibold tabular-nums ${selected ? "text-accent-ink/70" : "text-muted/70"}`}>{t.count}</span>
                  </Link>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={<IconSparkle size={20} />}
                title="The first page of our story"
                action={<Link href="#add" className="btn"><IconPlus size={15} /> Add the first page</Link>}
              >
                Add the day we met, a milestone, an adventure, or somewhere we want to go. You can also save any discovery here with “Save to Our Story”.
              </EmptyState>
            ) : (
              <>
                {(active === null || active === "plan") && hasPlans && (
                  <div className="mt-6 space-y-8">
                    {ahead.length > 0 && <PlanList rows={ahead} label="Still ahead of us" count={`${ahead.length} open`} />}
                    {achieved.length > 0 && <PlanList rows={achieved} label="Plans we've lived" count={`${achieved.length} done`} />}
                  </div>
                )}

                {active === "plan" && !hasPlans && <KindEmpty kind="plan" className="mt-6" />}

                {active !== "plan" && (
                  <section className={active === null && hasPlans ? "mt-10" : "mt-6"}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="type-section-title font-display">{filtered ? `All ${filtered.plural.toLowerCase()}` : "Our story so far"}</h2>
                      <span className="type-meta">
                        {visible.length} {visible.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    {visible.length === 0 ? (
                      active ? (
                        <KindEmpty kind={active} className="mt-4" />
                      ) : (
                        <EmptyState
                          className="mt-4"
                          icon={<IconSparkle size={20} />}
                          title="No moments kept yet"
                          action={<Link href="#add" className="btn"><IconPlus size={15} /> Add a memory</Link>}
                        >
                          Memories, milestones, adventures and discoveries will gather here. Plans stay on their own board above.
                        </EmptyState>
                      )
                    ) : (
                      <div className="mt-4 space-y-10">
                        {groups.map((group) => (
                          <div key={group.label}>
                            <h3 className="font-display sticky top-[4.15rem] z-10 -mx-1 bg-bg/90 px-1 py-2 text-lg font-semibold tracking-tight backdrop-blur md:top-3">{group.label}</h3>
                            <ol className="relative mt-2 space-y-4 border-l border-line pl-6">
                              {group.items.map((row) => (
                                <li key={row.m.id} className="relative">
                                  <span className="absolute -left-[2.2rem] top-4 grid size-7 place-items-center rounded-full bg-surface text-sm shadow-[var(--shadow-hairline)] ring-4 ring-bg" aria-hidden>
                                    {storyKindMeta(row.m.kind).icon}
                                  </span>
                                  <StoryEntry row={row} />
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>

          <aside id="add" className="scroll-mt-24">
            <div className="card-glow sticky top-20 p-5 sm:p-6">
              <p className="eyebrow-lux">Write it down</p>
              <h2 className="type-section-title font-display mt-2">Add to our story</h2>
              <p className="mt-1.5 text-sm text-muted">Pick what it is — it will be filed with the rest of that kind.</p>
              <ActionForm action={addMemory} submit="Keep it" className="mt-4 space-y-3">
                <fieldset>
                  <legend className="block text-sm font-semibold">What kind?</legend>
                  <div className="mt-1.5 grid gap-1.5">
                    {STORY_KINDS.map((k) => (
                      <label
                        key={k.kind}
                        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition hover:border-ink/20 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60"
                      >
                        <input type="radio" name="kind" value={k.kind} defaultChecked={defaultKind === k.kind} className="peer sr-only" />
                        <span className="text-base leading-5" aria-hidden>{k.icon}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-5">{k.label}</span>
                          <span className="block text-xs leading-snug text-muted">{k.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Title" name="title">
                  <input id="title" name="title" required className="field" placeholder="e.g. The day we met" />
                </Field>
                <Field label="Date" name="occurredOn" hint="(when it happened, or when we plan to)">
                  <input id="occurredOn" name="occurredOn" type="date" defaultValue={isoDay()} className="field" />
                </Field>
                <Field label="Where" name="place" hint="(optional)">
                  <input id="place" name="place" className="field" placeholder="Somewhere we were" />
                </Field>
                <Field label="Why it matters" name="why" hint="(optional)">
                  <textarea id="why" name="why" className="field min-h-16" placeholder="The reason it stayed with us" />
                </Field>
                <Field label="The story" name="body" hint="(optional)">
                  <textarea id="body" name="body" className="field" placeholder="What made it matter?" />
                </Field>
                <Field label="Photo" name="photo" hint="(optional)">
                  <PhotoPicker />
                </Field>
              </ActionForm>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
