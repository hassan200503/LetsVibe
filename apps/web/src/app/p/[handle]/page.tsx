import { notFound } from "next/navigation";
import { publicProfileByHandle } from "@/lib/public-profile";
import { Meter } from "@/components/ui/meter";

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
    <div data-world={p.theme} className={`bg-${p.theme} min-h-dvh`}>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-5xl font-semibold tracking-tight">{p.displayName}</h1>
        <p className="mt-3 text-lg">{[p.course, p.headline].filter(Boolean).join(" · ")}</p>
        {p.intro && (
          <div className="mt-6 space-y-3 leading-relaxed">
            {p.intro.split(/\n{2,}/).map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>
        )}
        {p.projects.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">Projects</h2>
            <ul className="mt-4 space-y-4">
              {p.projects.map((x) => (
                <li key={x.id} className="card p-5">
                  <p className="font-display text-xl font-semibold">{x.name}</p>
                  <p className="mt-1 text-muted">{x.description}</p>
                  <p className="mt-2 font-mono text-xs">{x.stack.join(" · ")}</p>
                  <p className="mt-3 flex gap-4 text-sm">
                    {x.repoUrl && (
                      <a href={x.repoUrl} className="text-accent underline">
                        Repository
                      </a>
                    )}
                    {x.liveUrl && (
                      <a href={x.liveUrl} className="text-accent underline">
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
            <h2 className="font-display text-2xl font-semibold">Skills</h2>
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
              {p.skills.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <Meter level={s.level} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
