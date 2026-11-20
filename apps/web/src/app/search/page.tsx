import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { searchAll } from "@/lib/data";
import { Container, PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { day } from "@/lib/ui/time";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const ctx = await requireCtx();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const hits = query.length >= 2 ? await searchAll(ctx, query) : [];
  const groups = new Map<string, typeof hits>();
  for (const h of hits) {
    const g = h.kind.startsWith("Discovery") ? "Discoveries" : h.kind;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(h);
  }
  return (
    <>
      <PageHeader world="us" eyebrow="Search" title="Find anything in your world">
        Memories, plans, journals, projects, skills, vault notes, philosophy, and every discovery the feeds have brought in.
      </PageHeader>
      <Container world="us">
        <form action="/search" role="search" className="flex max-w-2xl items-center gap-2 rounded-[1.3rem] border border-line bg-surface p-1.5 pl-4 shadow-[var(--shadow-hairline)] transition focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)]">
          <IconSearch size={18} className="shrink-0 text-muted" />
          <label htmlFor="world-search" className="sr-only">
            Search your world
          </label>
          <input id="world-search" name="q" defaultValue={query} autoFocus placeholder="CRISPR, Spring Boot, hornbill, our trip…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted/80" />
          <button className="btn shrink-0">Search</button>
        </form>

        {query.length >= 2 && (
          <p className="mt-4 text-sm text-muted" role="status">
            {hits.length} result{hits.length === 1 ? "" : "s"} for <span className="font-semibold text-ink">“{query}”</span>
          </p>
        )}

        {query.length >= 2 && hits.length === 0 ? (
          <EmptyState className="mt-6" icon={<IconSearch size={20} />} title="Nothing matched that yet">
            Try a shorter phrase, a person&apos;s name, or the name of a place or topic.
          </EmptyState>
        ) : (
          <div className="mt-6 space-y-8">
            {[...groups.entries()].map(([g, items]) => (
              <section key={g}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="type-section-title font-display">{g}</h2>
                  <span className="type-meta">
                    {items.length} {items.length === 1 ? "match" : "matches"}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
                  {items.map((h, i) => (
                    <li key={`${h.href}-${i}`}>
                      <Link href={h.href} className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-surface-2 focus-visible:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold group-hover:text-accent">{h.title}</span>
                          {h.snippet && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{h.snippet}</span>}
                          <span className="type-meta mt-1 block">{[h.kind, h.owner?.split(" ")[0], h.date ? day(h.date) : null].filter(Boolean).join(" · ")}</span>
                        </span>
                        <IconArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
