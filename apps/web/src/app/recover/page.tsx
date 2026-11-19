import Link from "next/link";
import { redirect } from "next/navigation";
import { BRAND } from "@lovora/domain";
import { getCtx } from "@/lib/context";
import { recoverPassword } from "@/lib/actions/auth";
import { Field, RecoveryForm } from "@/components/ui/forms";
import { Starfield } from "@/components/home/sky";

export const metadata = { title: `Recover · ${BRAND.name}` };

export default async function RecoverPage() {
  if (await getCtx()) redirect("/");
  return (
    <div className="min-h-dvh bg-[#07060a] p-0 text-[#f7efe1] sm:p-4">
      <div className="stage relative mx-auto flex min-h-dvh max-w-[1100px] items-center overflow-hidden rounded-none px-5 py-12 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[36px] sm:px-10">
        <Starfield count={120} />
        <div className="relative z-[3] mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow-lux">{BRAND.name}</p>
            <h1 className="font-lux mt-6 text-[3rem] leading-[1] tracking-[-0.02em]">Find your way back.</h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/60">
              Use the recovery code you saved when you created your account. It is shown once and never emailed. If you have lost it, no one can unlock the account — that is what keeps your world private.
            </p>
            <p className="mt-8 text-sm text-white/55">
              Remembered it?{" "}
              <Link href="/login" className="text-[#e2c794] underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-8">
            <RecoveryForm action={recoverPassword} submit="Set a new password" title="Your new recovery code" className="space-y-4">
              <Field label="Email" name="email">
                <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="field" />
              </Field>
              <Field label="Recovery code" name="code" hint="(XXXXX-XXXXX-XXXXX-XXXXX)">
                <input id="code" name="code" required autoComplete="one-time-code" spellCheck={false} className="field font-mono uppercase tracking-wider" />
              </Field>
              <Field label="New password" name="password" hint="(10+ characters)">
                <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
              </Field>
              <Field label="Confirm new password" name="confirm">
                <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" />
              </Field>
            </RecoveryForm>
          </div>
        </div>
      </div>
    </div>
  );
}
