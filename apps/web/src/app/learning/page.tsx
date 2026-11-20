import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { learningTogether } from "@/lib/data";
import { addSharedLearning, deleteSharedLearning, toggleLearningFavorite } from "@/lib/actions/shared";
import { ActionButton, ActionForm, ConfirmButton, Field } from "@/components/ui/forms";
import { Container, PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBook, IconFlask, IconStar, IconStarFilled } from "@/components/icons";
import { day, isoDay } from "@/lib/ui/time";

export const metadata = { title: "Things We Are Learning" };

const TOPICS = ["Science", "Technology", "Nature", "Philosophy", "Biotechnology", "Birds", "Knitting", "A book", "A documentary", "An article", "Something funny"];

export default async function LearningPage() {
  const ctx = await requireCtx();
  const rows = await learningTogether(ctx);
  return (
    <>
      <PageHeader
        world="us"
        eyebrow="Shared learning"
        title="Things we are learning"
        actions={
          <Link href="/research" className="btn btn-ghost">
            <IconFlask size={15} /> Research something new
          </Link>
        }
      >
        A shared notebook for anything either of us found worth knowing — a scientific idea, a new technology, a nature fact, a philosophical idea, a book, a documentary, or
        something that just made us laugh.
      </PageHeader>
      <Container world="us">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            {rows.length === 0 ? (
              <EmptyState icon={<IconBook size={20} />} title="Nothing yet. What did you learn this week?" action={<Link href="/research" className="btn"><IconFlask size={15} /> Look something up together</Link>}>
                Anything worth knowing can live here — a fact, a book, a documentary, or something that made you both laugh.
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {rows.map(({ l, by, byTheme }) => (
                  <li key={l.id} className="card card-hover flex min-w-0 flex-col p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {l.topic && <span className="chip">{l.topic}</span>}
                      <span className="type-meta">{day(l.occurredOn)}</span>
                      <span data-world={byTheme} className="ml-auto text-xs font-semibold text-accent">
                        {by.split(" ")[0]}
                      </span>
                    </div>
                    <h2 className="font-display mt-2.5 text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{l.title}</h2>
                    {l.notes && <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{l.notes}</p>}
                    <div className="mt-auto flex items-center gap-2 pt-4 text-sm">
                      {l.url ? (
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center text-sm font-semibold text-accent hover:underline">
                          {l.source ?? "Source"} →
                        </a>
                      ) : (
                        l.source && <span className="text-xs text-muted">— {l.source}</span>
                      )}
                      <ActionButton
                        onClick={toggleLearningFavorite.bind(null, l.id)}
                        className={`icon-btn ml-auto ${l.favorite ? "text-gold-ink" : "text-muted"}`}
                      >
                        {l.favorite ? <IconStarFilled size={17} /> : <IconStar size={17} />}
                        <span className="sr-only">{l.favorite ? "Remove from favourites" : "Favourite"}</span>
                      </ActionButton>
                      <ConfirmButton onConfirm={deleteSharedLearning.bind(null, l.id)} question="Remove this?" label="Remove" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="scroll-mt-24">
            <div className="card sticky top-20 p-5 sm:p-6">
              <p className="eyebrow-lux">Add to the notebook</p>
              <h2 className="type-section-title font-display mt-2">I learned something</h2>
              <ActionForm action={addSharedLearning} submit="Share it" className="mt-4 space-y-3">
                <Field label="What?" name="title">
                  <input id="title" name="title" required className="field" placeholder="The thing worth knowing" />
                </Field>
                <Field label="Topic" name="topic">
                  <input id="topic" name="topic" list="learning-topics" className="field" placeholder="e.g. Science" />
                  <datalist id="learning-topics">
                    {TOPICS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Notes" name="notes" hint="(optional)">
                  <textarea id="notes" name="notes" className="field" placeholder="Why it stayed with you" />
                </Field>
                <Field label="Source" name="source" hint="(optional)">
                  <input id="source" name="source" className="field" placeholder="Book, site or publication" />
                </Field>
                <Field label="Link" name="url" hint="(optional)">
                  <input id="url" name="url" type="url" className="field" placeholder="https://" />
                </Field>
                <Field label="Date" name="occurredOn">
                  <input id="occurredOn" name="occurredOn" type="date" defaultValue={isoDay()} className="field" />
                </Field>
              </ActionForm>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
