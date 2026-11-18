import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { BRAND, THEME_OPTIONS, coerceTheme } from "@letsvibe/domain";
import { getCtx } from "@/lib/context";
import { getDb } from "@/lib/db/client";
import { coupleMembers, couples, people } from "@/lib/db/schema";
import { readInvite } from "@/lib/auth/invite";
import { joinWorld } from "@/lib/actions/onboarding";
import { TOPICS, TOPIC_KEYS } from "@/lib/trends/topics";
import { ActionForm, Field } from "@/components/ui/forms";
import { Starfield } from "@/components/home/sky";

export const metadata = { title: "Join" };

type Invite = {
  relationshipName: string;
  hostName: string;
  hostTheme: string;
  full: boolean;
};

async function lookup(token: string): Promise<Invite | null> {
  const invite = readInvite(token);
  if (!invite) return null;
  const db = await getDb();
  const [couple] = await db.select().from(couples).where(eq(couples.id, invite.coupleId)).limit(1);
  if (!couple) return null;
  const active = and(eq(coupleMembers.coupleId, couple.id), eq(coupleMembers.status, "active"));
  const [{ n }] = await db.select({ n: count() }).from(coupleMembers).where(active);
  const [host] = await db
    .select({ displayName: people.displayName, theme: people.theme })
    .from(coupleMembers)
    .innerJoin(people, eq(people.id, coupleMembers.personId))
    .where(active)
    .limit(1);
  if (!host) return null;
  return { relationshipName: couple.name, hostName: host.displayName, hostTheme: coerceTheme(host.theme), full: Number(n) >= 2 };
}

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  if (await getCtx()) redirect("/");
  const { token } = await params;
  const invite = await lookup(token);
  const suggested = THEME_OPTIONS.find((t) => t.value !== invite?.hostTheme)?.value ?? "us";

  return (
    <div className="min-h-dvh bg-[#07060a] p-0 text-[#f7efe1] sm:p-4">
      <div className="stage relative mx-auto min-h-dvh max-w-[1400px] overflow-hidden rounded-none px-5 py-12 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[36px] sm:px-10">
        <Starfield count={140} />
        <div className="relative z-[3] mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="pt-4 lg:sticky lg:top-12">
            <p className="eyebrow-lux">{BRAND.name}</p>
            {invite ? (
              <>
                <h1 className="font-lux mt-6 text-[3.1rem] leading-[0.98] tracking-[-0.02em] sm:text-[4.2rem]">
                  Join {invite.hostName.split(" ")[0]} in {invite.relationshipName}.
                </h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">
                  Choose your own name, colour and interests. Your feed is built from what you pick — not what someone else picked for you.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-lux mt-6 text-[3.1rem] leading-[0.98] tracking-[-0.02em] sm:text-[4.2rem]">This invitation isn&apos;t available.</h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">The link may have expired, or your partner may already have joined. Ask for a fresh link, or sign in if you&apos;re already here.</p>
                <Link href="/" className="btn-gold mt-8">
                  Go to sign in
                </Link>
              </>
            )}
          </div>

          {invite && !invite.full && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-8">
              <ActionForm action={joinWorld} submit={`Join ${invite.relationshipName}`} className="space-y-5">
                <input type="hidden" name="token" value={token} />
                <Field label="Your name" name="displayName">
                  <input id="displayName" name="displayName" required autoComplete="name" placeholder="What should we call you?" className="field" />
                </Field>

                <fieldset>
                  <legend className="text-sm font-semibold">Choose your colour</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {THEME_OPTIONS.map((t) => (
                      <label key={t.value} data-world={t.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 p-2 text-sm has-checked:border-[#e2c794] has-checked:bg-white/10">
                        <input type="radio" name="theme" value={t.value} defaultChecked={t.value === suggested} />
                        <span className="size-5 rounded-full border border-white/20 bg-gradient-to-br from-accent to-accent-2" aria-hidden />
                        <span>
                          <span className="block font-semibold">{t.label}</span>
                          <span className="block text-xs text-white/45">{t.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-semibold">What are you curious about?</legend>
                  <p className="mt-1 text-xs text-white/45">Pick at least one. This shapes your For You feed and today&apos;s discovery.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {TOPIC_KEYS.map((t) => (
                      <label key={t} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/15 p-2 text-sm has-checked:border-[#e2c794] has-checked:bg-white/10">
                        <input type="checkbox" name="topic" value={t} className="mt-0.5" />
                        <span>
                          <span className="block font-semibold">
                            <span aria-hidden>{TOPICS[t].emoji}</span> {TOPICS[t].label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-white/45">{TOPICS[t].blurb}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Passcode" name="passcode" hint="(8+ characters)">
                    <input id="passcode" name="passcode" type="password" required minLength={8} autoComplete="new-password" className="field" />
                  </Field>
                  <Field label="Confirm passcode" name="confirm">
                    <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" />
                  </Field>
                </div>
              </ActionForm>
            </div>
          )}

          {invite?.full && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 text-sm leading-relaxed text-white/65">
              <p className="font-semibold text-white">This invitation has already been used.</p>
              <p className="mt-2">Your partner can create a fresh link from Settings → Invite your partner. If this is you, sign in below.</p>
              <Link href="/" className="btn-gold mt-6">
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
