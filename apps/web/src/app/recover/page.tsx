import Link from "next/link";
import { redirect } from "next/navigation";
import { BRAND } from "@lovora/domain";
import { getCtx } from "@/lib/context";
import { recoverPassword } from "@/lib/actions/auth";
import { Field, RecoveryForm } from "@/components/ui/forms";
import { PasswordInput } from "@/components/ui/password-input";
import { Starfield } from "@/components/home/sky";
import { IconArrowRight, IconLock, Monogram } from "@/components/icons";

export const metadata = { title: `Recover · ${BRAND.name}` };

export default async function RecoverPage() {
  if (await getCtx()) redirect("/");
  return (
    <div className="min-h-dvh bg-[#07060a] text-[#f7efe1] sm:p-3 lg:p-4">
      <div className="stage relative mx-auto flex min-h-dvh max-w-[1200px] items-center overflow-hidden rounded-none px-5 py-12 sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[32px] sm:px-8 lg:rounded-[36px] lg:px-12">
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <Starfield count={120} />
        <div className="relative z-[3] mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <Monogram size={32} />
              <p className="eyebrow-lux text-[#e7c98d]">{BRAND.name}</p>
            </div>
            <h1 className="font-lux mt-7 text-balance text-[2.6rem] leading-[1.0] tracking-[-0.02em] sm:text-[3.4rem]">Find your way back.</h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              Use the recovery code you saved when you created your account. It is shown once and never emailed.
            </p>
            <p className="mt-4 flex max-w-sm items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-xs leading-relaxed text-white/50">
              <IconLock size={15} className="mt-0.5 shrink-0 text-[#e2c794]" />
              If you have lost the code, no one can unlock the account — that is what keeps your world private.
            </p>
            <p className="mt-7 flex min-h-10 items-center text-sm text-white/55">
              Remembered it?&nbsp;
              <Link href="/login" className="inline-flex min-h-10 items-center gap-1 text-[#e2c794] underline-offset-4 hover:underline">
                Sign in <IconArrowRight size={13} />
              </Link>
            </p>
          </div>
          <div className="fade-late rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-8" style={{ "--d": "200ms" } as React.CSSProperties}>
            <RecoveryForm action={recoverPassword} submit="Set a new password" submitClass="btn-gold" title="Your new recovery code" className="space-y-4">
              <Field label="Email" name="email">
                <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" className="field" />
              </Field>
              <Field label="Recovery code" name="code" hint="(XXXXX-XXXXX-XXXXX-XXXXX)">
                <input id="code" name="code" required autoComplete="one-time-code" spellCheck={false} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" className="field font-mono uppercase tracking-wider" />
              </Field>
              <Field label="New password" name="password" hint="(10+ characters)">
                <PasswordInput id="password" name="password" minLength={10} />
              </Field>
              <Field label="Confirm new password" name="confirm">
                <PasswordInput id="confirm" name="confirm" minLength={10} />
              </Field>
            </RecoveryForm>
          </div>
        </div>
      </div>
    </div>
  );
}
