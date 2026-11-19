# ADR-004 — Rebrand to Lovora

- Status: Accepted by product owner (instruction, 2026-11-19)
- Date: 2026-11-19
- Supersedes: ADR-002 (Let'sVibe)
- Related: ADR-001 (stack), H5 (domains/handles), H24 (regions), E17 (multiuser)

## Context

The owner chose **Lovora** as the final brand before the first public launch. ADR-002 had deliberately kept several compatibility identifiers frozen (`ou_*` cookies, `our-universe/*` crypto labels, the `@letsvibe/*` package scope) because a rename could invalidate live sessions and sealed settings. Those constraints assumed an installed user base. There is none: the product has not launched, so the cleanest moment to make technical and public identity agree is now.

The owner also asked for the GitHub repository and the local project folder to be renamed, not only the UI copy.

## Decision

1. **Display brand:** `Lovora` in UI, metadata, manifest, notifications and docs.
2. **Technical brand:** `lovora` for the slug, package scope `@lovora/*`, root package `lovora`, repository name and local folder.
3. **Compatibility identifiers are renamed too:** session cookie `lovora_session`, verse/vow cookies `lovora_verses`/`lovora_vows`, and domain-separation labels `lovora/session-v1`, `lovora/settings-seal-v1`, `lovora/vapid-v1/*`. This signs out any existing development session and makes previously sealed settings unreadable; in exchange there is no forever-legacy brand in the security-critical path. Deployments must set `SESSION_SECRET` and re-enter any saved Gemini key or TURN relay after this change.
4. **Repository and folder:** the GitHub remote becomes `LetsVibe` → `Lovora`; the local working folder follows. Git history is preserved (a repository rename redirects the old URL).
5. **Privacy promises are unchanged:** private by default, two people per world, no public feed, no ads, no sale of data, and the same `visibleTo()` gate.
6. **Still human-owned before launch:** trademark clearance, domain/handles, support email, app-store IDs and store listings (H5/H24). The code uses `lovora` as a slug, not as proof that a domain or handle exists.

## Consequences

- Sessions and any locally saved encrypted settings from before this change are invalid; this is acceptable pre-launch and is documented in the runbook.
- The Web Push VAPID key pair derived from the session secret changes; existing development push subscriptions are dead and re-subscribe on the next visit.
- Historical documents that record the old name (this ADR series, audit evidence) remain as written; current product, code and deploy docs use Lovora.
- If a future domain migration is needed, add 301 redirects and keep the display name in one place (`packages/domain/src/brand.ts`) as before.

## Verification

- `BRAND.name === "Lovora"`, `BRAND.slug === "lovora"`.
- No `@letsvibe/` import, `letsvibe` slug, `ou_` cookie or `our-universe` crypto label remains outside historical ADR/audit notes.
- Manifest, page metadata, service-worker fallback titles and notification text use Lovora.
- Typegen, typecheck, lint, test, build and the production dependency audit pass.
