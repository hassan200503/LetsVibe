# ADR-002 — Rebrand to Let'sVibe

- Status: Accepted by product owner (instruction, 2026-11-15); trademark/domain clearance still required
- Date: 2026-11-15
- Supersedes: the product name "Our Universe" in current product docs (the repository and remote keep their existing name until a human renames them)
- Related: ADR-001 (stack), E0-011, H5, H24

## Context

The product began as a private universe for one couple. It is becoming a multi-tenant consumer product for thousands of couples on web, iOS and Android, with the stated ambition to operate at the scale and cultural presence of large social products. The owner has asked to rename it to **Let'sVibe** during the foundation phase.

A name is not just copy. It determines:

- trust and first impression for intimate content;
- trademark clearance, domains, handles and app-store search;
- technical identifiers (packages, cookies, storage keys, URLs, secrets derivation);
- future product scope (a couples-first brand vs a public social graph);
- migration cost if users, sessions or installed PWAs already exist.

This ADR records the name, the reasoning, the risks, and rules that keep the rename from breaking data or shipping an unintended product change.

## Decision

1. **Display brand: `Let'sVibe`** (ASCII apostrophe, no space) in UI, metadata and store listings where possible.
2. **Technical brand: `letsvibe`** everywhere an apostrophe is invalid or risky: npm/package scope `@letsvibe/*`, root package `letsvibe`, slug, file names, env prefixes, search keywords, domain candidates, handles.
3. **Descriptor: "A private universe for two."** It preserves the existing night-sky/universe identity and anchors "Vibe" away from public social or dating.
4. **Positioning stays private-for-two.** Let'sVibe is not a public feed, follower graph or ad product. If the owner later wants a public social network, that is a separate product/ADR with new privacy, moderation, safety and cost architecture; it must not be slipped in under this rename.
5. **Naming hierarchy:** brand Let'sVibe; each couple's space is user-nameable (default "Our World"); "universe" remains a visual metaphor, not the company name.
6. **Visual direction:** keep the existing typography and night-sky palette; set the wordmark in the existing serif with the descriptor nearby. No new logo system until a design pass; avoid stock "vibe" neon clichés.
7. **Repository.** The GitHub remote keeps its existing personal owner and repository name until a human renames it. Local product metadata and docs use Let'sVibe; history and audit evidence keep the former name with a note.

## Why not keep "Our Universe"

- The owner explicitly chose a new name; keeping it would create drift between brand and docs.
- "Our Universe" is intimate and distinctive but hard to own as a company name, and it says nothing about live media/calls, which are differentiators.
- It also encodes one couple's story, which must become per-couple data anyway (E1-013).

## Why Let'sVibe, and what it costs

Strengths:

- Short, verb-like, easy to say and remember; works as a call to action ("let's vibe") and extends beyond a single feature.
- Broad enough for watch/listen rooms, calls, rituals and future experiences; not boxed into "scrapbook".
- English "vibe" is widely understood in the initial English-speaking/Kenyan youth market.
- The apostrophe form is visually distinctive; the technical slug is clean.

Risks (recorded, not hidden):

- **Crowded namespace.** "Vibe" is used by media brands, apps and events. Trademark clearance in classes 9 (software), 42 (SaaS) and 45 (social/dating) is mandatory before spending on domains or launch marketing. The apostrophe does not create legal distance.
- **Casual/dating connotation.** "Vibe" can read as hookup/social-nightlife, which is the opposite of a private couples space. The descriptor, visual restraint and safety features must counter this; store screenshots must show couples, not nightlife.
- **Searchability.** "Vibe" alone is a terrible search term; always pair "Let'sVibe" with "couples" or "private". Canonical technical spelling `letsvibe` improves recall and URLs.
- **Apostrophe friction.** Users type "LetsVibe" or "Let's Vibe"; domains, handles and package names cannot contain it. Support both spellings in metadata/keywords, but keep one canonical display and one canonical slug.
- **Domain/handle availability is UNVERIFIED.** Do not assume `letsvibe.com`, `letsvibe.app` or `@letsvibe` are available. Human task H5 must reserve the chosen domain and handles before any public reference. Until then, docs use `letsvibe` as a slug, not a live URL.
- **Internationalisation.** "Vibe" is English slang; Swahili/French taglines will need localization later. The product name can remain a proper noun.

Alternatives considered (not selected):

| Option | Why not |
| --- | --- |
| Keep Our Universe | Owner directive; weak company scalability; encodes one couple |
| "Let's Vibe" with a space | More ambiguous in search/usernames; harder to own |
| "LetsVibe" without apostrophe everywhere | Simpler technically but loses the distinctive display form; keep it as technical variant only |
| Names such as Twofold / UsTwo / Hearth / Vela | Not requested; would restart naming and legal work; keep as fallbacks only if clearance fails (availability UNVERIFIED) |

## Technical naming rules

- Canonical display: `Let'sVibe` (U+0027 apostrophe). Do not mix curly `’` and straight `'` in the same surface; metadata uses the straight form for consistency.
- Canonical slug: `letsvibe`. Use it for package names, URL paths, app IDs (e.g. `app.letsvibe.mobile` — final ID requires human approval), search keywords, file names.
- Package scope: `@letsvibe/*`. Root private package: `letsvibe`.
- Environment variables stay unprefixed unless they are public brand config; no mass rename of operational env vars.
- **Frozen for compatibility (do not rename in this story):**
  - `ou_session`, `ou_verses`, `ou_vows` cookies;
  - `ou:*` localStorage/event keys;
  - crypto derivation labels (`our-universe/session-v1`, `our-universe/settings-seal-v1`, `our-universe/vapid-v1/*`) because changing them would invalidate sessions, sealed settings and push keys;
  - existing database names/rows.
  These are internal, invisible to users, and will be replaced deliberately during the Supabase Auth/Storage migration (E1/E2), not by cosmetic search-and-replace.
- The OpenAlex polite-pool mailto and VAPID subject keep the existing functional GitHub address until a real support domain exists (H4/H5); a fake `@letsvibe` address would break deliverability/verification.
- Installed PWAs may keep the old home-screen label until reinstalled/refreshed; document it, do not promise instant rename.
- Old links: when a domain exists, add 301 redirects from the old site; until then the repo/remote URL is unchanged.

## Product and scale implications

Operating at Instagram/Facebook scale is not achieved by a name. It requires trust and safety, moderation capacity, abuse resistance, unit economics, retention loops and legal operations. This rebrand does not change the scale target in MASTER_SPEC §2 (10,000 couples, 1,500 concurrent) or the private-by-construction model that differentiates the product.

If the ambition is a **public social network**:

- the data model needs a social graph, discovery, reporting at much larger volume, and different privacy defaults;
- moderation and CSAM/NCII operations become 24/7 functions, not a queue;
- costs shift from storage/AI to feed ranking, CDN and trust/safety headcount;
- brand safety and teen/minor policy become existential;
- app-store and regulatory scrutiny increases sharply.

That is a strategic pivot, not a rename. Decide it explicitly; do not degrade the private-couples guarantees while chasing growth.

## Rollout

1. **Now (E0-011):** brand module, metadata, manifest, visible copy, package identity, docs, ADR, tests; keep compatibility keys; note the unchanged remote.
2. **Before any public launch (human):** trademark search/clearance, domain and handles, support email, app IDs, store names, social accounts, legal review of the name. Update H5/H24 and `docs/COMPLIANCE.md`.
3. **Migration:** 301 redirects from the old domain if one exists; update store listings/PWA; keep legacy repo URL until renamed; rotate no crypto keys just for branding.
4. **Evidence:** screenshot audit for old name, `rg` report, manifest/metadata checks, gate output.

## Acceptance for E0-011

- Brand constants are the single source for app metadata and key UI surfaces.
- No user-facing "Our Universe" remains except historical audit/verification notes and the unchanged GitHub remote.
- Technical slug is `letsvibe`; compatibility keys are documented and unchanged.
- ADR-002 and HUMAN_TASKS cover trademark/domain/handle/email risks.
- Typegen, typecheck, lint, tests and build pass.
