import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/context";
import { SOURCES } from "@/lib/trends/sources";
import { TOPICS, isTopicKey } from "@/lib/trends/topics";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { BirdSpotlight } from "@/components/feed/bird-spotlight";
import { Container, PageHeader } from "@/components/ui/page-header";
import { IconChevronDown } from "@/components/icons";

const WORLD: Record<string, string> = { software: "indigo", technology: "indigo", philosophy: "indigo", biotech: "sage", birds: "sage", knitting: "sage", environment: "sage", nature: "us" };

export async function generateMetadata({ params }: PageProps<"/discover/[topic]">) {
  const { topic } = await params;
  return { title: isTopicKey(topic) ? TOPICS[topic].label : "Discover" };
}

export default async function TopicPage({ params, searchParams }: PageProps<"/discover/[topic]">) {
  await requireCtx();
  const { topic } = await params;
  if (!isTopicKey(topic)) notFound();
  const { category } = await searchParams;
  const t = TOPICS[topic];
  const sources = SOURCES.filter((s) => s.topic === topic);
  const world = WORLD[topic];
  const cats = [...t.categories.map((c) => c.name), t.fallbackCategory];
  const cat = typeof category === "string" && cats.includes(category) ? category : null;
  return (
    <>
      <PageHeader world={world} eyebrow={topic === "nature" ? "Shared by both of us" : "Discovery feed"} title={<><span aria-hidden>{t.emoji}</span> {t.label}</>}>
        {t.blurb}
      </PageHeader>
      <Container world={world}>
        {topic === "birds" && <BirdSpotlight />}
        <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          <Link href={`/discover/${topic}`} className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm transition ${!cat ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink"}`} aria-current={!cat ? "page" : undefined}>
            All
          </Link>
          {cats.map((c) => (
            <Link key={c} href={`/discover/${topic}?category=${encodeURIComponent(c)}`} className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm transition ${cat === c ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink"}`} aria-current={cat === c ? "page" : undefined}>
              {c}
            </Link>
          ))}
        </nav>
        <div className="mt-5">
          <InfiniteFeed key={`${topic}:${cat}`} params={{ feed: "topic", topic, category: cat }} topics={[topic]} />
        </div>
        <details className="group mt-9 rounded-[18px] border border-line bg-surface text-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Where this comes from <span className="text-xs font-normal text-muted">{sources.length} sources</span>
            <IconChevronDown size={15} className="text-muted transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t border-line px-4 py-3 text-muted">
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li key={s.key} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-ink">{s.name}</span>
                  <span className="text-xs">checked every {s.every >= 60 ? `${s.every / 60}h` : `${s.every} min`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3">
              We keep a title, a short excerpt and a link — never the full article. Images appear only where they are public domain or Creative Commons with credit.{" "}
              <Link href="/discover/sources" className="font-medium text-accent underline-offset-2 hover:underline">
                Source status
              </Link>
            </p>
          </div>
        </details>
      </Container>
    </>
  );
}
