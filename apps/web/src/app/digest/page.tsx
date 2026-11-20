import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { digest } from "@/lib/data";
import { personTopics } from "@/lib/trends/query";
import { TOPICS, type TopicKey } from "@/lib/trends/topics";
import { Avatar } from "@/components/avatar";
import { Container, PageHeader } from "@/components/ui/page-header";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { day, nowMs } from "@/lib/ui/time";
import { storyKindMeta } from "@/lib/story/kinds";

export const metadata = { title: "This Week" };

/**
 * The weekly digest, rendered as a page. The same `digest()` read model is what
 * a future email or push notification would send; nothing here is page-specific.
 */
export default async function DigestPage({ searchParams }: PageProps<"/digest">) {
  const ctx = await requireCtx();
  const { weeks } = await searchParams;
  const back = Math.max(0, Math.min(52, Number(weeks) || 0));
  const to = new Date(nowMs() - back * 7 * 86400_000);
  const from = new Date(to.getTime() - 7 * 86400_000);
  const d = await digest(ctx, from, to);
  const topicsBy = new Map(await Promise.all(ctx.members.map(async (m) => [m.id, await personTopics(m.id)] as const)));
  const highlight = new Map(d.highlights.map((h) => [h.topic, h]));

  return (
    <>
      <PageHeader
        world="us"
        eyebrow="Weekly digest"
        title={back === 0 ? "This week in our world" : `The week of ${day(from)}`}
        actions={
          <>
            <Link href={`/digest?weeks=${back + 1}`} className="btn btn-ghost">
              <IconChevronLeft size={15} /> Previous
            </Link>
            {back > 0 && (
              <Link href={back === 1 ? "/digest" : `/digest?weeks=${back - 1}`} className="btn btn-ghost">
                Next <IconChevronRight size={15} />
              </Link>
            )}
          </>
        }
      >
        {day(from)} – {day(to)}. Everything the two of you found, made and noticed.
      </PageHeader>
      <Container world="us">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [d.memories.filter((m) => m.kind !== "plan" && m.kind !== "discovery").length, "moments added"],
            [d.memories.filter((m) => m.photoUrl).length, "photos"],
            [d.memories.filter((m) => m.kind === "plan").length, "plans made"],
            [d.memories.filter((m) => m.kind === "discovery").length + d.learning.length, "discoveries & lessons"],
          ].map(([n, label]) => (
            <div key={label as string} className="card p-4 sm:p-5">
              <p className="font-display text-[2.2rem] font-semibold leading-none tracking-tight text-accent">{n}</p>
              <p className="type-meta mt-2">{label}</p>
            </div>
          ))}
        </section>

        {ctx.members.map((m) => {
          const first = m.displayName.split(" ")[0];
          const topics = (topicsBy.get(m.id) ?? []) as TopicKey[];
          const saved = d.saves.filter((s) => s.personId === m.id);
          const records = d.records.filter((r) => r.personId === m.id);
          return (
            <section key={m.id} data-world={m.theme} className="mt-12">
              <div className="flex items-center gap-3">
                <Avatar name={m.displayName} url={m.avatarUrl} theme={m.theme} size={32} />
                <h2 className="type-section-title font-display">This week in {first}&apos;s world</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {topics.map((t) => {
                  const h = highlight.get(t);
                  return (
                    <div key={t} className="card p-4">
                      <p className="eyebrow">
                        {TOPICS[t].emoji} {TOPICS[t].label}
                      </p>
                      {h ? (
                        <a href={h.source_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block font-semibold leading-snug hover:underline [overflow-wrap:anywhere]">
                          {h.title}
                          <span className="type-meta mt-1 block font-normal">
                            {h.source_name} · {day(h.published_at)}
                          </span>
                        </a>
                      ) : (
                        <p className="mt-1.5 text-sm text-muted">Nothing published this week.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {(records.length > 0 || saved.length > 0) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {records.length > 0 && (
                    <div className="rounded-[18px] border border-line bg-surface p-4">
                      <h3 className="type-label">{m.journalTitle}</h3>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {records.map((r) => (
                          <li key={r.id} className="flex gap-2">
                            <span className="text-accent" aria-hidden>·</span>
                            <span className="min-w-0 [overflow-wrap:anywhere]">{r.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {saved.length > 0 && (
                    <div className="rounded-[18px] border border-line bg-surface p-4">
                      <h3 className="type-label">Saved</h3>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {[...new Map(saved.map((s) => [s.t.id, s.t])).values()].slice(0, 8).map((t) => (
                          <li key={t.id} className="flex gap-2">
                            <span className="text-accent" aria-hidden>·</span>
                            <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 hover:underline [overflow-wrap:anywhere]">
                              {t.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        <section className="mt-12">
          <h2 className="type-section-title font-display">This week in our world</h2>
          {d.memories.length + d.learning.length === 0 ? (
            <p className="card mt-4 p-6 text-sm text-muted">A quiet week for our story. There&apos;s still time to add one.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {d.memories.map((m) => (
                <li key={m.id} className="card px-4 py-3 text-sm">
                  <span aria-hidden>{m.kind === "plan" && m.planDone ? "✅" : storyKindMeta(m.kind).icon}</span> {m.title}
                </li>
              ))}
              {d.learning.map((l) => (
                <li key={l.id} className="card px-4 py-3 text-sm">
                  <span aria-hidden>📚</span> {l.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}
