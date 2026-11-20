import { notFound } from "next/navigation";
import { publicProfileByHandle } from "@/lib/public-profile";
import { Meter } from "@/components/ui/meter";
import { Avatar } from "@/components/avatar";
import { IconMapPin } from "@/components/icons";

/**
 * Public profile, at an opaque handle rather than an account handle. Off unless
 * the person turned it on; the read itself is allowlisted in lib/public-profile.
 */
export async function generateMetadata({ params }: PageProps<"/p/[handle]">) {
  const { handle } = await params;
  const p = await publicProfileByHandle(handle);
  return { title: p?.displayName ?? "Profile", robots: { index: false } };
}

export default async function PublicProfile({ params }: PageProps<"/p/[handle]">) {
  const { handle } = await params;
  const p = await publicProfileByHandle(handle);
  if (!p) notFound();
  return (
    <div data-world={p.theme} className={`bg-${p.theme} grain min-h-dvh`}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={p.displayName} url={null} theme={p.theme} size={88} ring />
          <div className="min-w-0">
            <p className="eyebrow">A Lovora profile</p>
            <h1 className="type-page-title font-display mt-2">{p.displayName}</h1>
            <p className="type-body mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              {[p.course, p.headline].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>

        {p.intro && (
          <div className="mt-10 space-y-3 border-t border-line pt-8 text-[1.02rem] leading-[1.75] [overflow-wrap:anywhere]">
            {p.intro.split(/\n{2,}/).map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>
        )}

        {p.projects.length > 0 && (
          <section className="mt-12">
            <h2 className="type-section-title font-display">Projects</h2>
            <ul className="mt-4 grid gap-4">
              {p.projects.map((x) => (
                <li key={x.id} className="card card-hover p-5">
                  <p className="font-display text-xl font-semibold">{x.name}</p>
                  <p className="type-body mt-1 text-muted [overflow-wrap:anywhere]">{x.description}</p>
                  <p className="mt-2 font-mono text-xs text-muted">{x.stack.join(" · ")}</p>
                  <p className="mt-3 flex flex-wrap gap-4 text-sm">
                    {x.repoUrl && (
                      <a href={x.repoUrl} className="inline-flex min-h-8 items-center font-semibold text-accent hover:underline">
                        Repository
                      </a>
                    )}
                    {x.liveUrl && (
                      <a href={x.liveUrl} className="inline-flex min-h-8 items-center font-semibold text-accent hover:underline">
                        Live
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.skills.length > 0 && (
          <section className="mt-12">
            <h2 className="type-section-title font-display">Skills</h2>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
              {p.skills.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <Meter level={s.level} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-14 flex items-center justify-center gap-2 text-xs text-muted">
          <IconMapPin size={13} aria-hidden /> Shared from a private Lovora world
        </footer>
      </div>
    </div>
  );
}
