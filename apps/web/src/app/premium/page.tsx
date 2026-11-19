import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/context";
import { flagFor } from "@/lib/flags/server";
import { planUsage } from "@/lib/entitlements/server";
import { comparePlans } from "@/lib/entitlements/paywall";
import { PLAN_LABEL, PLAN_LIMITS } from "@/lib/entitlements/core";
import { resetLabel } from "@/lib/entitlements/format";
import { Container, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Premium" };

export default async function PremiumPage() {
  const ctx = await requireCtx();
  if (!(await flagFor(ctx.relationship.id, "paywall"))) notFound();

  const plan = await planUsage(ctx.relationship.id);
  const rows = comparePlans(plan.limits, PLAN_LIMITS.premium);
  const current = PLAN_LABEL[plan.plan];

  return (
    <>
      <PageHeader world={ctx.me.theme} eyebrow="Premium" title="More room, when you want it">
        The two of you share one plan. These are the limits on {current.toLowerCase()} today and what Premium would raise them to.
      </PageHeader>
      <Container world={ctx.me.theme}>
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Your plan</p>
              <h2 className="font-display mt-1 text-xl font-semibold">{current}, shared by both of you</h2>
            </div>
            <span className="chip">{current}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            The limits below come from your account&apos;s entitlement, not from this page. Monthly counters reset on {resetLabel(plan.resetsAt)}.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <caption className="sr-only">Current and Premium limits</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4 font-semibold">What&apos;s included</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">{current}</th>
                  <th scope="col" className="py-2 font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-line/60">
                    <th scope="row" className="py-2.5 pr-4 font-medium">{row.label}</th>
                    <td className="py-2.5 pr-4 tabular-nums text-muted">{row.current}</td>
                    <td className={`py-2.5 tabular-nums ${row.grows ? "font-semibold text-accent" : "text-muted"}`}>{row.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-xl border border-line/70 bg-surface-2/40 p-4">
            <p className="text-sm font-semibold">Billing isn&apos;t open yet</p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Pricing hasn&apos;t been decided, so there is nothing to buy on this screen and no card details are collected. Nothing here charges you. If you need more room before
              then, ask support and they can adjust your limits; the change is audited.
            </p>
            <button type="button" className="btn btn-primary mt-4" disabled aria-describedby="billing-note">
              Coming soon
            </button>
            <span id="billing-note" className="ml-3 text-xs text-muted">Purchases are disabled in this version.</span>
          </div>
          <p className="mt-4 text-sm">
            <a href="/settings#plan" className="text-accent underline underline-offset-4">Back to your plan and usage</a>
          </p>
        </section>
      </Container>
    </>
  );
}
