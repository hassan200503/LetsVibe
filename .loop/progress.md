# Loop progress

## Iteration 001 — 2026-11-15 — E0-001 Bootstrap

- Branch: `autonomous/couples-v2` (from `main` @ `ebd08c4`). No push, no production access.
- Read `PROMPT.md`, `MASTER_SPEC.md`, the app routes/components/lib, schema, deploy/CI/env docs.
- Real gate baseline on this machine (Windows, node v24.16.0, npm 11.13.0):
  - `npm ci` — pass, 568 packages, 23 advisories (1 critical, 8 high, 13 moderate, 1 low).
  - `npm run typecheck` — fail on fresh checkout (missing Next generated types); `npx next typegen` then pass.
  - `npm run lint` — pass. `npm test` — pass, 4 files / 41 tests.
  - `npm run build` — pass, Next 16.3.6; Turbopack root warning.
- External claims checked against official sources (see `docs/VERIFICATION.md`): Supabase Realtime limits, Spotify quota modes, Apple 1.2/4.8/5.1.1(v), Google Play API 36 deadline, YouTube developer policies. Kenya ODPC, Jamendo, LiveKit and Expo/16 KB items remain UNVERIFIED.
- Secret scan: manual only (gitleaks absent); history contains only `.env.example`; no pattern hits for common key formats.
- Produced: `.loop/audit.md`, `docs/adr/001-stack.md`, `docs/PARITY.md`, `.loop/prd.json` (147 stories, E0–E13, schema exactly `{id, epic, title, description, acceptance, priority number, dependsOn, status, attempts, notes}`), `AGENTS.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PRIVACY.md`, `docs/COMPLIANCE.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION.md`, `loop.sh`, `opencode.json`.
- Backlog alignment: added missing MASTER_SPEC §4/§10 scope — design tokens/feature flags, optional password/MFA, paywall UI, shared calendar, lists/bucket list, notes/time capsules, check-ins/nudges, quizzes, long-distance mode, app lock/discreet notifications, call-in-media PiP, CC/public-domain video, playlists/now-playing, background audio, sync-protocol simulator, date ideas, opt-in places, widgets, low-bandwidth/offline, copyright takedown, re-auth, E2EE ADR, CSP, safety resources, MASVS, resilience, mobile perf, DPIA.
- Decisions: keep Next.js web; add Expo; Supabase Postgres/Auth/Storage/Realtime with Drizzle and RLS; pnpm/Turborepo; P2P WebRTC; YouTube official embed, no Spotify.
- Blockers recorded in `HUMAN_TASKS.md` (format per MASTER_SPEC §11, each with `Answer:`): pnpm/gitleaks, paid accounts/email domain, legal review, store accounts, migration claim.
- Learnings: the loop schema is camelCase with numeric priorities; phase 0 must seed HUMAN_TASKS from §11; a fresh checkout needs `next typegen`; the audit's dependency/CVE claims must stay limited to observed output; Realtime default Pro capacity is insufficient at target scale.
- Commit: `chore(loop): bootstrap audit, plan and backlog` (this iteration). Suggested next story: `E0-002` (pnpm + Turborepo monorepo). If pnpm is unavailable, mark it blocked per gate rules and take `E0-003`/`E0-004`. Gate: keep the web app green during the move.

## Iteration 002 — 2026-11-15 — E0-011 Rebrand to Let'sVibe

- Human directive: rename the product to **Let'sVibe** while continuing the foundation phase. ADR-002 records the name, private-for-two positioning, legal/handle risks and rollout.
- Added `src/lib/brand.ts` as the public identity source of truth (`BRAND.name`, slug, tagline, description, default space name) and `src/lib/brand.test.ts`, including manifest consistency.
- Updated visible UI and metadata: root metadata, app manifest, navigation wordmark, login, home, search, chat, push prompts, presence, call permission copy and service-worker notification fallbacks.
- Updated package identity to `letsvibe` (`package.json` + lockfile), Agent guide, README, DEPLOY, product/spec/prompt docs, seed/relationship defaults, passcode and go-live scripts, and `.claude/launch.json`.
- Frozen for compatibility (documented in ADR-002): `ou_session`, `ou_verses`, `ou_vows`, `ou:*` storage/events, `ou-q:` question seed, `our-universe/session-v1`, `our-universe/settings-seal-v1`, `our-universe/vapid-v1/*`, and the OpenAlex/VAPID `our-universe@users.noreply.github.com` contact until a real domain exists.
- Kept the GitHub remote `hassan200503/our-universe` and historical audit/verification references. Existing couples keep their stored space name; only new seeds use "Our World". Installed PWAs may show the old label until refreshed.
- Gates: `npx next typegen` pass; `npm run typecheck` pass; `npm run lint` pass; `npm test` pass (5 files / 44 tests); `npm run build` pass (33 pages, only the known external `package-lock.json` warning).
- Learnings: centralize brand strings but never move frozen cookie/crypto identifiers into the brand module; use Node/UTF-8 for bulk text edits on PowerShell 5.1; search for lowercase and hyphenated legacy names, not just title case.
- Next: `E0-002` (pnpm + Turborepo monorepo), now consuming `@letsvibe/*` package names.

## Iteration 003 - 2026-11-15 - E0-002 pnpm + Turborepo monorepo

- Moved the Next.js app to `apps/web` and added `packages/domain` (brand/domain source) plus `packages/config` (shared TS base). Root workspace is pnpm 12.21.0 + Turborepo 2.11.11 on Node >=24.
- Chose an incremental package set: `api-client`, `sync-protocol`, `ui-tokens` and `i18n` are deferred until the stories that first consume them; E0-002 acceptance was corrected instead of committing empty architecture shells.
- Updated app imports to `@letsvibe/domain`, deleted the old `src/lib/brand.ts`, and kept brand/manifest tests in the web package.
- Updated Netlify (base `apps/web`), Vercel root, CI, ingest workflow, env example, scripts and docs for pnpm/monorepo paths.
- pnpm 12 uses `allowBuilds` in `pnpm-workspace.yaml`; approved `esbuild`, `@tailwindcss/oxide`, `sharp` and `unrs-resolver` after the initial install skipped build scripts.
- Local Windows blocker: global `pnpm` was absent and `corepack enable` hit EPERM under `C:\Program Files\nodejs`. A user-writable shim via `corepack enable --install-directory C:\Users\kkc36\AppData\Local\corepack` works; it must be on PATH for Turborepo. Root scripts now use `corepack pnpm`, and `go-live` no longer invokes a bare `pnpm`.
- Gates on the monorepo: `pnpm install --frozen-lockfile` pass; `pnpm typegen` pass; `pnpm typecheck` pass (domain + web); `pnpm lint` pass; `pnpm test` pass (5 files / 44 tests); `pnpm build` pass (Next 16.3.6, 33 pages).
- Learnings: Turborepo needs the package-manager binary on PATH, not only `corepack pnpm`; keeping the root scripts on `corepack pnpm` removes the nested-shim failure; moving a tree with `git mv` preserves renames while package extraction still shows as add/delete.
- Next: `E0-004` (patch critical/high advisories) because it is local and unblocked; `E0-003` remains partially blocked on gitleaks.

## Iteration 004 - 2026-11-15 - E0-004 patch critical/high advisories

- Upgraded `next` and `eslint-config-next` from 16.3.6 to 16.4.6, and `zod` to 4.6.7.
- Before the upgrade, `pnpm audit --prod` showed 11 findings: 2 critical, 3 high, 5 moderate, 1 low. The two criticals were Next image/SVG and `use cache` typed-array RCE advisories; the highs were Next SSRF/Server Action DoS plus a transitive zod memory-exhaustion advisory.
- `@vercel/blob@2.9.0` (latest) pulls `@vercel/cli-config@0.3.1`, which pins `zod@4.1.11`. Added `overrides: { zod: 4.6.7 }` to `pnpm-workspace.yaml`. pnpm 12 warns that `pnpm.overrides` in package.json is no longer read, so the root package field was removed.
- After the upgrade, `pnpm audit --prod` reports **no known vulnerabilities**. Full `pnpm audit` reports only 2 moderate dev-tool findings: `esbuild <=0.24.2` through drizzle-kit's legacy `@esbuild-kit` chain, and `minimatch <11.0.1` through ESLint tooling. Both are documented in `docs/SECURITY.md`; neither ships at runtime.
- Gates: `pnpm install --frozen-lockfile` pass (lockfile updated); `pnpm typegen` pass; `pnpm typecheck` pass (domain + web); `pnpm lint` pass; `pnpm test` pass (5 files / 44 tests); `pnpm build` pass (Next 16.4.6, 33 pages).
- Learnings: pnpm 12 moved project settings (including overrides) to `pnpm-workspace.yaml`; the package.json field is silently ignored. A network DNS failure interrupted the first Next download; the retry reused the store and completed.
- Next: `E0-007` (generic demo seed + one-command developer path). `E0-003` remains blocked on the missing gitleaks binary (H1).

## Iteration 005 - 2026-11-15 - E0-007 one-command developer experience and docs

- Replaced the personal seed with a fictional demo couple, Alex and Sam (both theme `us`), with generic interests, skills, projects and radar data. No real names, contact details or personal facts remain in the seed path.
- Added root `setup` script: `pnpm run setup` installs, runs typegen and seeds the demo. `pnpm run` is required because pnpm has a built-in `pnpm setup` command; README, AGENTS and RUNBOOK use the explicit form.
- Documented Node 24+/pnpm 12.21.0 prerequisites and kept one-command local setup database-free (PGlite in `apps/web/.data/`).
- Updated `.env.example` to `SEED_ALEX_PASSCODE`/`SEED_SAM_PASSCODE`, `go-live` wording and DEPLOY copy. Seed-generated passcodes stay in git-ignored `.env.local`.
- Removed the hardcoded Hassan/Whitney home-world line and added a generic `us` emblem fallback; per-theme legacy worlds remain until E0-010/E1-013.
- Fresh-workspace simulation (copy without `node_modules`, `.git`, `.data` or `.env.local`): `pnpm run setup` installed 558 packages, typegen passed, generated passcodes and created Alex/Sam. Running seed again printed only `Done.`; DB counts: 2 people, 1 relationship, 2 members, 8 interests, 2 preferences, 5 skills, 2 projects, 8 radar lanes, 4 radar items.
- Gates on the source tree: `pnpm check` PASS: typegen; typecheck 2 packages; lint clean; 5 files / 44 tests; Next 16.4.6 build 33 pages. No new warnings reported.
- Learnings: `pnpm setup` is a built-in pnpm command, so a package script named `setup` must be invoked as `pnpm run setup`; `pnpm run setup` also bootstraps root dependencies on a fresh checkout. Windows was exercised locally; macOS/Linux use the same commands but were not executed in this environment.
- Next: `E0-008` (CI gates and PR template). `E0-003` remains blocked on gitleaks (H1).

## Iteration 006 - 2026-11-16 - Fresh-start onboarding and neutral identity (E1-013 done; E1-005/E1-006 slice)

- Human directive: remove every founding-couple reference, let a new person create the world and invite a partner, collect each person's interests, and make discoveries follow those interests. Kept the private-for-two architecture; a public social-network pivot still needs its own ADR.
- Removed legacy names from the shipped source, copy, docs and links. Added neutral theme keys `us`, `indigo` and `sage` with per-person colour selection in Settings, and reduced world vocabulary to one generic, per-person configuration. The current tree has no case-insensitive Hassan/Whitney/Sumaiya matches outside git history/build/data; history was not rewritten.
- Added first-run `/welcome`: the first person names the shared world, sets the start date, picks a colour and at least one interest, and creates a passcode. Added `/join/[token]`: a signed 24-hour invitation that shows who is inviting, lets the partner choose their own name, colour and interests, and closes once the pair is full.
- Added a private invite section in Settings and a home CTA while the pair is incomplete. Added `pnpm reset` (refuses when DATABASE_URL is set) to clear local PGlite data and generated seed passcodes so the next visit starts at `/welcome`.
- Allowed `/welcome` and `/join/` through the optimistic auth proxy; both enforce their own server-side access rules. Login now sends an empty database to `/welcome`.
- End-to-end verification with Playwright and a real empty PGlite database: `/` -> `/login` -> `/welcome`; Riley created `Test World` (indigo; software, technology); the invite appeared; Morgan joined in a fresh browser context (sage; philosophy, nature); DB had 2 people, 1 relationship, 2 members and 4 interests; Morgan's home showed the pair and each person's topics; Settings hid the used invite and exposed colour selection.
- Gates: `git diff --check` pass; `node --check` pass for go-live/reset; `pnpm check` PASS (typegen, typecheck 2 packages, lint clean, 5 files / 44 tests, Next 16.4.6 build 34 pages). Local test data was reset after verification.
- Remaining: E1-005 still needs rate limiting, audit/revoke and E1-003 multi-tenant auth; E1-006 still needs timezone/notification defaults, resumable progress and native parity. A Facebook/Instagram-scale public network remains out of scope without product approval.
- Next: E0-008 (CI gates and PR template). E0-003 remains blocked on gitleaks (H1).

## Iteration 007 - 2026-11-16 - CI gates and PR evidence (E0-008)

- Reworked `.github/workflows/ci.yml`: every PR and main push runs typegen, typecheck, lint, unit tests, production build and `pnpm audit --prod --audit-level=high`; no gate uses `continue-on-error`. Added pnpm-store/Next/Turbo caching, PR concurrency cancellation, read-only token permissions, telemetry off and a 20-minute timeout.
- Added `.github/pull_request_template.md` requiring story id, real gate counts, acceptance evidence, parity/docs updates, risk/rollback and security/privacy checks. Documented the stable required check `CI / check` and the local equivalent in RUNBOOK/AGENTS.
- Added H30: a repo admin must protect `main` and require `CI / check`; branch protection cannot be enforced from repository code. E0-008 stays in progress until that is done and the GitHub median runtime is measured.
- Evidence: workflow YAML parses; `pnpm install --frozen-lockfile` pass; `pnpm check` PASS (typegen, typecheck 2 packages, lint clean, 5 files / 44 tests, Next 16.4.6 build 34 pages); `pnpm audit --prod --audit-level=high` reports no known vulnerabilities.
- Next: E1-001 identity schema (couples, couple_members, invitations, profiles, consents), preserving existing data through a rename/backfill migration and adding schema constraint tests.

## Iteration 008 - 2026-11-16 - Identity schema and legacy backfill (E1-001)

- Renamed `relationships` -> `couples` and `relationship_members` -> `couple_members` in migration `0006_identity.sql`; renamed dependent FK constraints so the Drizzle snapshot stays stable, and verified `db:generate` reports no pending schema changes.
- Added `slot` (1/2), `status` (active/left) and `joined_at` to `couple_members`: partial unique indexes enforce at most two active members per couple and at most one active couple per person. Existing rows backfill slots 1-2.
- Added `invitations` (hashed token, expiry, revoke/accept fields, single-use conditional update, unique token), `profiles` (timezone/locale/onboarding state, one per person) and `consents` (kind/version, one acceptance per version). Existing people get Nairobi profiles to preserve current date behaviour.
- Onboarding now inserts the host in slot 1 and partner in slot 2 inside a transaction, writes the profile and returns the used-invite error on a concurrent slot conflict. Context resolves active membership only. Seed writes slots and profiles.
- Evidence: 7 new PGlite tests cover the two-member cap, one-active-couple rule, single-use invite, duplicate token hash, profile/consent uniqueness, and migration of a pre-0006 relationship with two people plus a memory that survives rename and cascades on couple deletion. Full `pnpm check`: 7 files / 51 tests, 34-page build. Seed followed by reset succeeded.
- Risk: `relationship_id` remains on content tables; no RLS or Supabase Auth yet. The rename has not been rehearsed against a staging copy (E0-006/H3), so the production migration remains unverified.
- Next: E0-009 design tokens or E1-002 RLS foundation. E1-002 needs Supabase staging and RLS test access; if blocked, take a local unblocked story.

## Iteration 009 - 2026-11-16 - CSP and security headers (E9-011, in progress)

- Added `src/lib/security/headers.ts`: production security headers (nosniff, frame denial, referrer/permissions policy, COOP/CORP, production-only HSTS), a per-request nonce CSP that permits Next.js, YouTube iframes/API and same-origin APIs, and a sanitizer for CSP/Reporting API payloads.
- Wired `next.config.ts` to serve the static headers on every route. `proxy.ts` now covers authenticated and public page routes, passes a fresh nonce to Next, sets the response CSP and `Reporting-Endpoints`, and keeps optimistic auth redirects; `/api`, static assets and service-worker files stay out of the matcher.
- Added `/api/csp-report`: accepts `application/csp-report` and `application/reports+json`, rejects other types/invalid/oversized bodies, and logs only the effective directive plus masked blocked origin. It never logs `document-uri`, referrer, query strings or page content.
- CORS remains same-origin default-deny: no `Access-Control-Allow-Origin` header and no wildcard exist; `docs/SECURITY.md` records that future cross-origin endpoints need an explicit allowlist and test.
- Evidence: 7 new tests (headers/CSP builder + report route); full `pnpm check` PASS with 9 files / 58 tests and 35-route production build. Production-mode local server check: `/welcome` 200 with matching HTML/CSP nonce, HSTS `max-age=63072000`, `X-Frame-Options: DENY`, referrer/permissions/Reporting-Endpoints present; `/` 307 to `/login`; report POST returned 204 and logged `{"directive":"script-src-elem","blocked":"https://evil.example"}` with no secret. No `Access-Control-*` header observed.
- Remaining: run an external header scan against a deployed HTTPS URL (needs E0-006/staging) and exercise the YouTube embed in a real browser under enforced CSP. E9-011 stays in progress until those checks exist.
- Next: E0-009 design tokens (local, unblocked) or E1-002 RLS foundation if Supabase staging access appears.

## Iteration 010 - 2026-11-17 - Shared design tokens (E0-009)

- Added `@letsvibe/ui-tokens`: typed `src/tokens.ts` is the source of truth for palette, world accents, type, spacing, radii, elevation and motion; `src/css.ts` renders committed `tokens.css`; the build task fails when the generated file is stale. Web consumes it from `globals.css` and Turbo no longer warns about a missing output.
- Migrated the base palette, fonts, controls, cards, tiles, toasts, eyebrow/display type, prose, radii, shadows and the main transition/animation timings to token variables. `themeColor` and the PWA manifest now read the same palette values. `.num-lux` keeps its original Cormorant stack.
- Visual evidence: authenticated production builds compared with the pre-story worktree at `8e4496c` using Playwright computed styles. Home and chat report **0 diffs in both light and dark**. The comparison freezes animations and samples one rotating-verse word so daily content cannot produce false diffs.
- Reduced motion: `--motion-duration-base`/`fast` become `.01ms`; computed `.btn`/`.field` transitions are `1e-05s` and the ambient shimmer animation is `none`.
- Added `docs/DESIGN.md` with the north star, Instagram/Facebook/X quality bar, the useful/unique/valuable/loved product standard, token architecture, and the remaining hardcoded-value removal plan owned by E10-004/E10-005. Updated AGENTS and architecture references.
- Gates: `pnpm check` PASS: typegen; typecheck 4 packages; lint clean; 9 files / 58 tests; `tokens.css up to date`; 35-route Next 16.4.6 build. Temporary servers and baseline worktree removed; local demo data reset.
- Next: E1-002 RLS foundation if Supabase staging access lands; otherwise take the next local unblocked story.

## Iteration 011 - 2026-11-17 - WCAG 2.2 AA core web audit (E10-001)

- Added repeatable `pnpm a11y`: axe-core 4.14 + playwright-core authenticate against a seeded production server and scan home, chat, calls, gallery and settings with WCAG 2.2 A/AA tags. `A11Y_SCHEME=dark` selects the dark palette; the command exits non-zero on any violation and writes a JSON report.
- First scan found five issues: low-contrast gold eyebrow labels, a low-contrast sage chip, unlabeled avatar/gallery file inputs, `aria-label` on plain status spans, and a settings link distinguished only by colour. Fixed all of them, plus an ARIA naming issue on the chat loading skeleton.
- Added `--gold-ink` (`text-gold-ink`) for small gold text while keeping `--gold` for lines, material and large marks; darkened the light sage accent from `#4f7a63` to `#47715a` so chips reach 4.74:1.
- Keyboard audit: 19-24 visible focus stops per core screen, global 2px focus rings present, and hidden file inputs removed from the tab order because visible buttons trigger them. The label-style photo picker now shows a focus-within ring.
- Evidence: axe **0 violations in light and dark** on all five screens; `pnpm check` PASS (typegen, 4-package typecheck, lint clean, 9 files / 58 tests, 35 routes, tokens up to date). Known scope/exceptions documented in `docs/DESIGN.md`.
- Next: E1-012 entitlements and limits model (local, unblocked) unless Supabase staging access appears for E1-002/E1-003.

## Iteration 012 - 2026-11-17 - Entitlements and limits model (E1-012)

- Added per-couple `entitlements` (plan, storage, AI questions/month, rooms, exports), a monthly `usage_ledger` keyed by UTC `YYYY-MM` with idempotent source ids, and an `audit_log` protected by a `BEFORE UPDATE OR DELETE` trigger. A migration backfills every existing couple onto the free plan.
- Limits are server-side and enforced before the work: presigned and local uploads plus avatars reserve the real byte count (including legacy base64 photos), AI questions are reserved inside a row-locked transaction before any model call with a streamed usage event, and the Together room returns a clear 403 plus a resting UI when `rooms=0`.
- Added an audited break-glass path (`pnpm entitlements`) requiring `ENTITLEMENTS_ADMIN=1`, an actor, a 4+ character reason and explicit flags; every change records before/after values. There is no client-callable mutation action.
- UI: Settings has a plan/usage section with four meters; Gallery shows shared storage and disables upload at the limit; Research shows questions left and a clear exhausted/excluded state that disables asking. Zero limits read as "Not included" rather than a misleading "1 of 0".
- Evidence: 6 new PGlite tests cover defaults, storage boundaries with base64 photos, AI quota boundaries and source idempotency, room disable, audited before/after and input validation. `pnpm check` PASS: typegen, 4-package typecheck, lint clean, 10 files / 64 tests, 35-route production build. `pnpm a11y` on `/`, `/research`, `/gallery`, `/together`, `/settings`: **0 WCAG 2.2 A/AA violations**. Local production/dev screenshots verified normal, AI-excluded and room-disabled states; demo limits were restored afterwards.
- Learnings: a retried AI reservation must check its source id before the limit, otherwise the retry fails at the boundary even though no second row would be inserted. Usage text for zero limits needs a distinct "Not included" state. `pnpm a11y` route lists need a wrapper script in Git Bash because leading-slash env values are path-converted.
- Next: E1-002 RLS foundation if Supabase staging access lands; otherwise take the next local unblocked story. E6-003 quota dashboard depends on this model.
