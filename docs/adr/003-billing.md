# ADR-003 — Billing and the flag-gated paywall

- **Status:** Proposed. The `paywall` flag stays off by default; purchases are disabled in v1.
- **Date:** 2026-11-19
- **Deciders:** product owner (pricing and vendor approval), engineering
- **Related:** E1-016, H3 (budget), H23 (business model and pricing), `docs/VERIFICATION.md` V17–V18

## Context

Plans and limits already exist as server-side entitlements (`apps/web/src/lib/entitlements`). A couple's limits are read from the `entitlements` row, enforced on every AI question, upload, room and export, and changed only by an audited break-glass path. Nothing about the plan is client-controlled.

The product brief asks for a paywall, but H23 explicitly forbids inventing a price, and H3 has not approved a payment vendor. E1-016 therefore asks for a screen that explains what Premium would include, behind a flag, with the purchase path present but visibly disabled. That lets the screen be designed, translated, reviewed and store-screenshotted without charging anyone or implying a price.

The web app ships first; iOS and Android later. The billing rules therefore matter now even though nothing is for sale: the screen's copy and the eventual purchase placement must not violate either store's rules.

## Decision

1. **One entitlement-driven screen at `/premium`.** It renders the couple's own current limits from `planUsage` beside the Premium limits from the plan table. An audited per-couple override is reflected; the screen never repeats a marketing number that disagrees with what the server enforces.
2. **No price and no checkout in this version.** The CTA is a native `disabled` button, there is no payment SDK, no network call and no card field. The copy says pricing has not been decided and that nothing charges the user.
3. **The flag is the only switch.** `paywall` defaults off; resolving it is server-side (`flagFor(ctx.relationship.id, "paywall")`). When off, `/premium` returns 404 and Settings shows no link, so the paywall does not exist anywhere for that couple. When on, both the link and the page appear.
4. **When billing is enabled**, the platform rules below require:
   - iOS: digital features unlocked in the app must use in-app purchase (StoreKit), not an external checkout.
   - Android: in-app purchases of digital goods, including app functionality and subscriptions, must use Google Play's billing system; inside the app, users may not be led to another payment method except where the Payments policy allows it.
   - Cross-platform access must remain available as an in-app purchase on each store (3.1.3(b)).
   - The server, not the client, validates receipts and writes the entitlement; every change goes through the audited override path or a billing webhook with the same audit properties.
5. **Web billing is undecided.** Using a web payment processor for a web purchase is a decision for H3/H23 together with legal review; no processor is chosen here.

## Verified platform rules

Read from the official pages on 2026-11-19 and recorded in `docs/VERIFICATION.md`.

| Platform | Rule (short quote) | Source |
| --- | --- | --- |
| Apple | **3.1.1:** "If you want to unlock features or functionality within your app … you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality." | https://developer.apple.com/app-store/review/guidelines/ |
| Apple | **3.1.3(b) Multiplatform Services:** apps may let users access content or features bought elsewhere, "provided those items are also available as in-app purchases within the app." | same |
| Apple | **3.1.1(a):** external-purchase links are entitlement/region-dependent; in the United States storefront, buttons and links to other purchase methods are permitted. This exception is jurisdictional and must be rechecked per storefront before use. | same |
| Google Play | "Google Play's billing system is required for developers offering in-app purchases of digital goods and services distributed on Google Play." Covered examples include "App functionality or content (such as an ad-free version of an app or new features not available in the free version)" and subscription services. | https://support.google.com/googleplay/android-developer/answer/10281818 |
| Google Play | Outside the app you may communicate alternative purchase options. "Within an app, developers may not lead users to a payment method other than Google Play's billing system unless Section 3, 8, or 9 of Payments policy applies." | same |

These summaries are not legal advice. Store policy changes; the links and dates above are the checkpoint, and H27/H28-style re-verification is required before any billing code is enabled.

## Consequences

- The paywall can be reviewed, translated and tested without a merchant account or a pricing decision, and cannot charge anyone.
- Enabling billing later is a product, legal and platform task, not a flag flip: it needs a vendor (H3), a pricing model (H23), receipt validation, refund handling, tax treatment and store review.
- The screen cannot drift from enforcement: a support override changes the "current" column because it reads the same entitlement row the limit checks use.
- If pricing is decided as "Premium is never sold", the flag can stay off permanently and the page can be deleted without touching entitlements.

## Revisit when

- H23 records a pricing model and H3 approves the vendors.
- Apple or Google policies change (especially external-purchase links and regional programs).
- A native app enters store review: the purchase path must exist in-app before submission.
