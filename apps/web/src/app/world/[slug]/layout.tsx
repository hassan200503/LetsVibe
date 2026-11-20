import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/context";
import { worldFor } from "@/lib/worlds";
import { WorldEmblem } from "@/components/world-emblem";
import { Avatar } from "@/components/avatar";
import { IconSettings } from "@/components/icons";
import { WorldTabs } from "./world-tabs";

export default async function WorldLayout({ children, params }: LayoutProps<"/world/[slug]">) {
  const ctx = await requireCtx();
  const { slug } = await params;
  const person = ctx.members.find((m) => m.slug === slug);
  if (!person) notFound();
  const own = person.id === ctx.me.id;
  const first = person.displayName.split(" ")[0];
  const motto = person.motto ?? worldFor().tagline;
  const tabs = [
    { href: "", label: "Dashboard" },
    { href: "/journal", label: person.journalTitle },
    ...(person.features.includes("projects") ? [{ href: "/projects", label: "Things I'm Building" }] : []),
    { href: "/skills", label: "Skills" },
    { href: "/radar", label: person.radarTitle },
    ...(person.features.includes("thinking") ? [{ href: "/thinking", label: "Questions I'm Thinking About" }] : []),
    { href: "/vault", label: "Knowledge Vault" },
  ];
  return (
    <div data-world={person.theme}>
      <header className={`bg-${person.theme} grain relative overflow-hidden`}>
        <div className="relative mx-auto max-w-6xl px-4 pb-2 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <Avatar name={person.displayName} url={person.avatarUrl} theme={person.theme} size={76} ring className="mb-4" />
              <p className="eyebrow">{own ? "Your world" : `${first}'s world`}</p>
              <h1 className="type-page-title font-display mt-2.5 max-w-2xl">{person.displayName}</h1>
              {person.birthday && (
                <p className="type-meta mt-2">
                  🎂{" "}
                  {new Date(`${person.birthday}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}
                </p>
              )}
              <p className="type-body mt-3 max-w-2xl">
                {[person.course, person.headline ?? person.focus].filter(Boolean).join(" · ")}
              </p>
              <p className="font-display mt-2 max-w-xl text-sm italic text-muted">{motto}</p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <WorldEmblem theme={person.theme} />
            </div>
          </div>
          {own && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href="/settings#profile" className="btn btn-ghost">
                <IconSettings size={15} /> Edit profile
              </Link>
              <Link href={`/discover?as=${person.slug}`} className="btn btn-quiet">
                Your discoveries
              </Link>
            </div>
          )}
          <WorldTabs base={`/world/${person.slug}`} tabs={tabs} />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</div>
    </div>
  );
}
