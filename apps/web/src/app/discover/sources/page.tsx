import { requireCtx } from "@/lib/context";
import { getDb } from "@/lib/db/client";
import { trendSources } from "@/lib/db/schema";
import { SOURCES } from "@/lib/trends/sources";
import { TOPICS } from "@/lib/trends/topics";
import { Container, PageHeader } from "@/components/ui/page-header";
import { ago } from "@/lib/ui/time";

export const metadata = { title: "Source status" };

const TIER = ["", "Official organisation", "University", "Research institution", "Scientific publication", "Government", "Technology publication", "Industry publication", "Open-source / project"];

export default async function SourcesPage() {
  await requireCtx();
  const db = await getDb();
  const states = new Map((await db.select().from(trendSources)).map((s) => [s.key, s]));
  return (
    <>
      <PageHeader world="us" eyebrow="Behind the feeds" title="Source status">
        Every source, what kind of organisation it is, and whether it answered last time. Failing sources retry by themselves with growing gaps, and we honour any rate limit
        they ask for.
      </PageHeader>
      <Container world="us">
        <div className="card overflow-x-auto rounded-[18px]">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface-2/60 text-left text-[0.7rem] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Source</th>
                <th className="px-4 py-2.5 font-semibold">Feed</th>
                <th className="px-4 py-2.5 font-semibold">Kind</th>
                <th className="px-4 py-2.5 font-semibold">Last success</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => {
                const st = states.get(s.key);
                return (
                  <tr key={s.key} className="border-t border-line transition hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3">
                      {TOPICS[s.topic].emoji} {TOPICS[s.topic].label}
                    </td>
                    <td className="px-4 py-3 text-muted">{TIER[s.tier]}</td>
                    <td className="px-4 py-3 text-muted" suppressHydrationWarning>
                      {st?.lastSuccessAt ? ago(st.lastSuccessAt) : "never"}
                    </td>
                    <td className="px-4 py-3">
                      {!st || st.consecutiveFailures === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300" title={st.lastError ?? ""}>
                          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> Retrying ({st.consecutiveFailures}× · {st.lastError})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Container>
    </>
  );
}
