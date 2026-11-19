import Link from "next/link";
import { redirect } from "next/navigation";
import { BRAND, THEME_OPTIONS } from "@lovora/domain";
import { getCtx } from "@/lib/context";
import { startWorld } from "@/lib/actions/onboarding";
import { TOPICS, TOPIC_KEYS } from "@/lib/trends/topics";
import { Field, RecoveryForm } from "@/components/ui/forms";
import { Starfield } from "@/components/home/sky";

export const metadata = { title: "Begin" };

export default async function WelcomePage() {
  if (await getCtx()) redirect("/");

  return (
    <div className="min-h-dvh bg-[#07060a] p-0 text-[#f7efe1] sm:p-4">
      <div className="stage relative mx-auto min-h-dvh max-w-[1400px] overflow-hidden rounded-none px-5 py-12 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[36px] sm:px-10">
        <Starfield count={140} />
        <div className="relative z-[3] mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="pt-4 lg:sticky lg:top-12">
            <p className="eyebrow-lux">{BRAND.name}</p>
            <h1 className="font-lux mt-6 text-[3.1rem] leading-[0.98] tracking-[-0.02em] sm:text-[4.2rem]">Begin your shared world.</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">
              One profile each. One private place for your story. Pick the ideas you want to see, and your discoveries will follow them.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/60">
              <li>Choose your interests — your feed is built from them.</li>
              <li>Invite your partner with a private link.</li>
              <li>Your shared world stays yours: no public feed, no ads.</li>
            </ul>
            <p className="mt-8 text-sm text-white/55">
              Already have a world?{" "}
              <Link href="/login" className="text-[#e2c794] underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-8">
            <RecoveryForm action={startWorld} submit="Create our world" className="space-y-5">
              <Field label="Your name" name="displayName">
                <input id="displayName" name="displayName" required autoComplete="name" placeholder="What should we call you?" className="field" />
              </Field>

              <Field label="Email" name="email" hint="(used to sign in)">
                <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="field" />
              </Field>

              <Field label="What do you call your shared world?" name="relationshipName">
                <input id="relationshipName" name="relationshipName" required defaultValue={BRAND.defaultSpaceName} className="field" />
              </Field>

              <Field label="The day it all began" name="startedOn" hint="(optional)">
                <input id="startedOn" name="startedOn" type="date" className="field" />
              </Field>

              <fieldset>
                <legend className="text-sm font-semibold">Choose your colour</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {THEME_OPTIONS.map((t) => (
                    <label key={t.value} data-world={t.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 p-2 text-sm has-checked:border-[#e2c794] has-checked:bg-white/10">
                      <input type="radio" name="theme" value={t.value} defaultChecked={t.value === "us"} />
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
                <Field label="Password" name="password" hint={`(${10}+ characters)`}>
                  <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
                </Field>
                <Field label="Confirm password" name="confirm">
                  <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" />
                </Field>
              </div>

              <p className="text-xs leading-relaxed text-white/40">
                Next you&apos;ll get a private invitation link for your partner. They choose their own name, colour and interests.
              </p>
            </RecoveryForm>
          </div>
        </div>
      </div>
    </div>
  );
}
