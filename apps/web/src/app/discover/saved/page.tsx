import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { TOPIC_KEYS } from "@/lib/trends/topics";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { Container, PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBookmark, IconHeart, IconStar } from "@/components/icons";

export const metadata = { title: "Saved" };

const TABS = [
  { kind: null, label: "Everything", icon: null },
  { kind: "save", label: "Saved", icon: IconHeart },
  { kind: "favorite", label: "Favourites", icon: IconStar },
  { kind: "bookmark", label: "Bookmarks", icon: IconBookmark },
];

export default async function SavedPage({ searchParams }: PageProps<"/discover/saved">) {
  const ctx = await requireCtx();
  const { kind } = await searchParams;
  const k = typeof kind === "string" && TABS.some((t) => t.kind === kind) ? kind : null;
  return (
    <>
      <PageHeader world={ctx.me.theme} eyebrow="Kept by you" title="Saved discoveries">
        Everything you&apos;ve saved stays here, even when a source goes quiet.
      </PageHeader>
      <Container world={ctx.me.theme}>
        <nav aria-label="Filter saved discoveries" className="segmented max-w-full overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                href={t.kind ? `/discover/saved?kind=${t.kind}` : "/discover/saved"}
                data-active={k === t.kind}
                aria-current={k === t.kind ? "page" : undefined}
                className="seg-tab shrink-0"
              >
                {Icon && <Icon size={14} />}
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-5">
          <InfiniteFeed
            key={k ?? "all"}
            params={{ feed: "saved", kind: k }}
            topics={[...TOPIC_KEYS]}
            empty={
              <EmptyState className="mt-4" icon={<IconHeart size={20} />} title="Nothing saved yet">
                Tap the heart, star or bookmark on any discovery and it will wait for you here.
              </EmptyState>
            }
          />
        </div>
      </Container>
    </>
  );
}
