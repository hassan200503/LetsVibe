import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireCtx } from "@/lib/context";
import { getDb } from "@/lib/db/client";
import { people, savedDiscoveries } from "@/lib/db/schema";
import { getTrend } from "@/lib/trends/query";
import { TOPICS } from "@/lib/trends/topics";
import { TrendCardView } from "@/components/feed/trend-card";
import { Container } from "@/components/ui/page-header";
import { IconArrowUpRight, IconChevronLeft } from "@/components/icons";
import { day } from "@/lib/ui/time";

export default async function ItemPage({ params }: PageProps<"/discover/item/[id]">) {
  const ctx = await requireCtx();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const item = await getTrend(ctx.members, id);
  if (!item) notFound();
  const db = await getDb();
  // Notes are shared inside the relationship only, so the query itself is
  // narrowed to this couple's members rather than filtered after the fact.
  const memberIds = ctx.members.map((m) => m.id);
  const notes = (
    await db
      .select({ note: savedDiscoveries.note, name: people.displayName, personId: people.id })
      .from(savedDiscoveries)
      .innerJoin(people, eq(people.id, savedDiscoveries.personId))
      .where(and(eq(savedDiscoveries.trendId, id), eq(savedDiscoveries.kind, "save"), inArray(savedDiscoveries.personId, memberIds)))
  ).filter((n) => n.note);
  const t = TOPICS[item.topic];
  return (
    <Container className="pt-5 pb-10 sm:pt-7">
      <Link href={`/discover/${item.topic}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full pr-3 text-sm text-muted transition hover:text-ink">
        <IconChevronLeft size={15} /> {t.emoji} {t.label}
      </Link>
      <div className="mt-3 grid gap-8 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:gap-10">
        <div className="md:sticky md:top-4 md:self-start">
          <TrendCardView item={item} />
        </div>
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-accent">
            <span className="h-px w-6 bg-current opacity-45" aria-hidden />
            Discovery
          </p>
          <h2 className="type-section-title mt-2">About this discovery</h2>
          <dl className="mt-4 divide-y divide-line rounded-[18px] border border-line bg-surface">
            {[
              ["Source", item.sourceName],
              ["Topic", `${t.label} · ${item.category}`],
              [item.contentType === "observation" ? "Shared" : "Published", day(item.publishedAt)],
              ...(item.sourceUpdatedAt ? [["Last updated", day(item.sourceUpdatedAt)] as const] : []),
              ["Retrieved", day(item.fetchedAt)],
              ...(item.imageLicense ? [["Image licence", item.imageLicense] as const] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-4 px-4 py-3 text-sm">
                <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{k}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
              </div>
            ))}
          </dl>
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-5">
            Read the original at {item.sourceName} <IconArrowUpRight size={15} />
          </a>
          {notes.length > 0 && (
            <div className="mt-9">
              <h3 className="type-section-title text-base">Notes</h3>
              <ul className="mt-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.personId} className="flex gap-3 rounded-[16px] border border-line bg-surface-2/60 p-3.5 text-sm">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-semibold uppercase text-accent" aria-hidden>
                      {n.name[0]}
                    </span>
                    <p className="min-w-0 [overflow-wrap:anywhere]">
                      <span className="font-semibold">{n.name.split(" ")[0]}:</span> {n.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
