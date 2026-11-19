import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCtx } from "@/lib/context";
import { BRAND } from "@lovora/domain";
import { pick, parseVerse, VERSE_COOKIE, VERSES } from "@/lib/journey/verses";
import { Starfield } from "@/components/home/sky";
import { RememberLines } from "@/components/home/remember";
import { Monogram } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata = { title: `Sign in · ${BRAND.name}` };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCtx()) redirect("/");
  const { next } = await searchParams;
  const verse = pick(VERSES, (await cookies()).get(VERSE_COOKIE)?.value);
  let i = 0;
  return (
    <div className="min-h-dvh bg-[#07060a] p-0 sm:p-4">
      <RememberLines cookies={{ [VERSE_COOKIE]: verse.remember }} />
      <div className="stage relative flex min-h-dvh items-center sm:min-h-[calc(100dvh-2rem)] sm:rounded-[36px]">
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <Starfield count={180} />
        <div className="relative z-[3] mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="fade-late flex items-center gap-3" style={{ "--d": "0ms" } as React.CSSProperties}>
              <Monogram size={34} />
              <span className="eyebrow-lux">{BRAND.name}</span>
            </div>
            <h1 className="verse font-lux mt-10 text-balance text-[2.6rem] leading-[1.04] tracking-[-0.012em] text-[#f7efe1] sm:text-[3.8rem] lg:text-[4.4rem]">
              {parseVerse(verse.text).map((part, p) =>
                part.t.split(/(\s+)/).map((w, k) =>
                  /^\s+$/.test(w) ? (
                    <span key={`${p}-${k}`}> </span>
                  ) : w ? (
                    <span key={`${p}-${k}`} className={`w ${part.em ? "gold-shimmer italic" : ""}`} style={{ "--i": i++ } as React.CSSProperties}>
                      {w}
                    </span>
                  ) : null,
                ),
              )}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/55">{BRAND.tagline} No public feed. No ads. Just the two of you.</p>
            <div className="fade-late mt-8 flex flex-wrap items-center gap-4 text-sm text-white/55" style={{ "--d": "800ms" } as React.CSSProperties}>
              <Link href="/welcome" className="text-[#e2c794] underline underline-offset-4">
                Create your private world
              </Link>
              <span aria-hidden>·</span>
              <Link href="/recover" className="underline underline-offset-4 hover:text-white">
                Recover an account
              </Link>
            </div>
          </div>
          <div className="fade-late" style={{ "--d": "600ms" } as React.CSSProperties}>
            <LoginForm next={typeof next === "string" ? next : "/"} />
          </div>
        </div>
      </div>
    </div>
  );
}
