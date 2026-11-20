import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { personTopics } from "@/lib/trends/query";
import { TOPICS } from "@/lib/trends/topics";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { Avatar } from "@/components/avatar";
import { Container, PageHeader } from "@/components/ui/page-header";
import { IconBookmark, IconSettings, IconUsers } from "@/components/icons";

export const metadata = { title: "For You" };

export default async function ForYouPage({ searchParams }: PageProps<"/discover">) {
  const ctx = await requireCtx();
  const { as } = await searchParams;
  const viewing = ctx.members.find((m) => m.slug === as) ?? ctx.me;
  const topics = await personTopics(viewing.id);
  const self = viewing.id === ctx.me.id;
  const others = ctx.members.filter((m) => m.id !== viewing.id);
  return (
    <>
      <PageHeader
        world={viewing.theme}
        eyebrow="For You"
        title={self ? `Something new, ${viewing.displayName.split(" ")[0]}` : `What ${viewing.displayName.split(" ")[0]} is discovering`}
        actions={
          <>
            <Link href="/discover/saved" className="btn btn-ghost">
              <IconBookmark size={15} /> Saved
            </Link>
            <Link href="/settings#personalise" className="btn btn-quiet">
              <IconSettings size={15} /> Personalise
            </Link>
          </>
        }
      >
        A mix of everything {self ? "you follow" : `${viewing.displayName.split(" ")[0]} follows`}, freshest first, with no single topic crowding out the rest.
      </PageHeader>
      <Container world={viewing.theme}>
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {topics.map((t) => (
            <Link key={t} href={`/discover/${t}`} className="chip min-h-9 shrink-0 border border-accent/10 hover:border-accent/25">
              <span aria-hidden>{TOPICS[t].emoji}</span> {TOPICS[t].label}
            </Link>
          ))}
          {others.map((o) => (
            <Link
              key={o.id}
              href={o.id === ctx.me.id ? "/discover" : `/discover?as=${o.slug}`}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-muted transition hover:border-ink/20 hover:text-ink"
            >
              <Avatar name={o.displayName} url={o.avatarUrl} theme={o.theme} size={20} />
              {o.id === ctx.me.id ? "Back to mine" : `Peek at ${o.displayName.split(" ")[0]}'s`}
              <IconUsers size={13} className="opacity-50" />
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <InfiniteFeed key={viewing.slug} params={{ feed: "for-you", as: viewing.slug }} topics={topics} />
        </div>
      </Container>
    </>
  );
}
