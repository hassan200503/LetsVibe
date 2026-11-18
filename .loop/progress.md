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

## Iteration 013 - 2026-11-17 - AI usage metering, metered quizzes and per-couple keys (E7-003)

- Gemini `usageMetadata` is now read for streamed research answers and structured quizzes. Thinking tokens count as output; cumulative counts from streamed chunks are merged by maximum, and the final counts are written back to the question's reserved `usage_ledger` row.
- `usage_ledger` gained `model`, `prompt_tokens`, `completion_tokens`, `total_tokens` and `cost_micros` (migration `0008_jittery_ultragirl.sql`, with non-negative checks). Cost is an estimate in micro-USD at published per-model rates (flash, flash-lite, pro), explicitly labelled as an estimate because the provider's bill is authoritative.
- Settings shows monthly tokens and estimated AI cost beside the existing plan meters: "your key, your bill — we never mark usage up."
- Quizzes are now entitled AI calls: they reserve one monthly question, record their tokens/cost, return 429 with the reset-guidance message when the allowance is spent, and show that message in the quiz dialog. A missing key is checked before reservation so configuration errors never consume allowance.
- BYO Gemini keys are scoped per couple (`secret:gemini-api-key:<coupleId>`), still AES-256-GCM sealed, with only hint/by/at shown in Settings. The deployment `GEMINI_API_KEY` still wins. A previously saved global DB key is deliberately not copied to couples: re-save it in Settings after this change.
- Evidence: new PGlite test covers token/cost recording, cross-couple isolation and rate ordering; new sealed-settings test proves the stored blob does not contain the key, tampering fails, and per-couple names differ. `pnpm check` PASS: typegen, 4-package typecheck, lint clean, 11 files / 67 tests, 35-route production build. Axe **0 violations** on `/settings` and `/research` in light and dark. Desktop and mobile screenshots of the updated plan section inspected.
- Learnings: Gemini streams cumulative usage, so merge by maximum rather than summing chunks. Metering must attach to the already-reserved source id; a separate insert would double-count the question. Scoping a secret by couple also scopes its cache entry, which keeps the 60-second cache correct.
- Next: E6-003 quota dashboard (now unblocked by the metering columns) or E7-004 AI safety and citation quality; E1-002 RLS still waits on Supabase staging access.

## Iteration 014 - 2026-11-17 - Reduced-motion and forced-colours verification (E10-005)

- Added a global `prefers-reduced-motion: reduce` base rule: every element, pseudo-element and Tailwind utility gets `0.01ms` animation/transition durations, zero delays, one iteration and `scroll-behavior: auto`. Ambient CSS (aurora, petals, stars, shimmer, word reveals, typing, call rings) stays independently gated behind `no-preference`.
- Added Windows High Contrast (`forced-colors: active`) fallbacks: gradient headline text becomes `CanvasText` instead of transparent, `.card-glow`/buttons/chips regain visible system edges, decorative aurora/stars/petals/grain are hidden, and keyboard focus re-asserts a 2px `Highlight` outline even where utilities set `outline-none`.
- Added `pnpm motion` / `scripts/motion-audit.mjs`, a repeatable Playwright audit of login plus home, research, chat, calls, gallery and settings. It reports rendered elements with reduced-motion leaks, infinite animations faster than 333 ms, invisible gradient text under forced colours, axe WCAG 2.2 AA violations there (colour-contrast disabled because the OS owns the palette), and three keyboard focus stops per route with a visible outline. JSON report and non-zero exit on findings.
- Validated the detectors themselves: an injected 2 s transition computes to 1e-05 s under reduce; a 100 ms infinite animation is caught in normal motion; `matchMedia("(forced-colors: active)")` is true under emulation; gradient text computed as black/border-box and focus as a 2px solid Highlight outline. Forced-colours screenshots of login and Settings were inspected and remain legible and clearly interactive.
- Evidence: `pnpm motion` PASS 0 findings on 7 routes; existing `pnpm a11y` still **0 violations** on the 5 core routes in light and dark; production build refreshed. Full `pnpm check` run before commit.
- Learnings: gating custom CSS behind `no-preference` is not enough because Tailwind's `animate-pulse` and transition utilities ship their own durations; a global reduce rule is needed. In forced colours, `background-clip: text` plus `color: transparent` loses its gradient and leaves invisible text, and `outline-none` removes the only focus cue once box-shadow rings are suppressed.
- Next: E7-004 AI safety and citation quality (local), or E12-006/E12-007 once their contract/performance scope is pinned down; E1-002 RLS still waits on Supabase staging access.

## Iteration 015 - 2026-11-18 - AI safety and citation quality (E7-004)

- Added `src/lib/research/safety.ts`: retrieved study abstracts and web snippets are wrapped in a labelled fence whose body has every run of two or more `<` rewritten, so quoted text cannot forge the closing marker; the system prompt carries the matching "data, never instructions" rule.
- Crisis routing is sentence-scoped and needs first-person evidence (self-harm signals plus `I/my/we`, or being hit/threatened/abused), so "what do domestic-violence statistics say" is answered normally while "he hits me most nights" is not. A crisis match short-circuits before the key, quota and model calls, streams a `safety` event with external resources and writes nothing but metadata to the log.
- Answer quality: citations are pruned to the source numbers actually retrieved, the streamed body is run through an output guard (system-prompt leaks, obeyed injections, unsafe text) and a blocked or guarded answer replaces the text with a safe fallback. Gemini requests now send explicit safety settings and a `promptFeedback.blockReason` or safety `finishReason` is treated as blocked.
- Client: `research-app.tsx` handles the new `safety` event, discards partial text, removes a thread that never received a message, and renders `safety-card.tsx` as a `role="alert"` so the card announces itself and the retry affordance stays available.
- Evidence: 6 new unit tests (fence escaping, crisis true/false cases, resource shape, citation pruning, output guard, metadata-only logging) — `pnpm check` PASS: typegen, 4-package typecheck, lint clean, 11 files / 73 tests, 35-route production build. `pnpm a11y` **0 violations** on `/`, `/together/chat`, `/together`, `/gallery`, `/settings`, `/research`, `/learning` in light and dark; `pnpm motion` PASS **0 findings** on the same 7 routes.
- Learnings: a fence that only wraps text is breakable — the quoted body must be neutralised too. Crisis detection needs a first-person gate, otherwise topic questions ("research domestic violence") are misrouted. Under the sandbox `next start` cannot initialise the embedded PGlite (Turbopack external + WASM), so the runtime audits are run against `next dev --webpack --port 3100`, which does.
- Next: E12-006/E12-007 once scoped, or the next unblocked local story; E1-002 RLS still waits on Supabase staging access.

## Iteration 016 - 2026-11-18 - Shared rituals with a forgiving streak (E1-017)

- Took ownership of the in-flight uncommitted ritual work and finished it rather than rewriting it: `src/lib/rituals/{day,streak,shared-day,queries,actions}.ts`, `src/components/rituals/{board.tsx,use-rituals.ts}` and `src/app/together/rituals/page.tsx`, over new `rituals` and `ritual_checks` tables (drizzle `0009_flowery_franklin_richards.sql`).
- Domain: `streakFrom` anchors at today when a ritual is kept and at yesterday otherwise, so a day that is still open never reads as a break; `isDay` rejects impossible dates by round-trip; `coupleDay` resolves the shared day from the first active member's `profiles.timezone`, falling back to UTC. Unit tests cover boundaries, daylight saving and malformed input.
- Server: every action calls `requireCtx()` and scopes by `ctx.relationship.id`; toggle derives the day from `coupleDay()` and writes a milestone note to `roomEvents` every 30 days; `MAX_RITUALS` is 12 and the time field is validated against `^([01][0-9]|2[0-3]):[0-5][0-9]$`.
- Client: optimistic taps with rollback, a "keep all" that only appears once two rituals are open (it would be noise for one), a weekly toggle that becomes kept and disabled, archive behind a confirm, and a 12-week rhythm grid. Hardcoded `emerald`/`white` badges moved to the new `success`/`success-ink` tokens and the manifest gained Messages and Rituals shortcuts.
- One real defect found by the gates: the "all kept" badge was a bare `<span aria-label>`, which is prohibited on the generic role — axe reported `aria-prohibited-attr` on `/together/rituals`. Fixed with `role="img"`, matching `meter.tsx`.
- Evidence: `pnpm typecheck` pass (3 tasks), `pnpm lint` pass (cache miss, 54s), `pnpm test` pass (13 files / 89 tests), `pnpm build` pass (36 routes including `ƒ /together/rituals`). Runtime on `next dev --webpack --port 3100` after `pnpm reset` + `pnpm seed`: a golden-path harness ran **17/17** checks (first-run starters, add, keep, un-keep, keep all, custom ritual with a time, archive, weekly kept-and-disabled, instant header counts, truthful `aria-pressed`, no console errors, no 360px overflow in either scheme) with screenshots at 1440, 768 and 360 in light and dark. `pnpm a11y` and `A11Y_SCHEME=dark pnpm a11y` both report **0 violations** on `/`, `/together/chat`, `/together`, `/together/rituals`, `/gallery`, `/settings`; `pnpm motion` is **PASS, 0 findings** across eight routes.
- Learnings: this sandbox kills a `Start-Process`-detached dev server, but keeps one started as a managed background job, and it intermittently refuses pnpm's own lock files — a non-zero exit caused by the task-run lock is not a gate failure (the audit output above it is the evidence). Also: a `<span>` carrying only `aria-label` is an axe violation; it needs `role="img"`.
- Docs: `docs/PARITY.md` gains row 39 (shared rituals) with the story that owns it, `.loop/prd.json` gains E1-017 as done, and `docs/DESIGN.md` records the new state tokens and the corrected six-screen/eight-route audit lists. `.loop/STATUS` stays `CONTINUE`.
- Next: HANDOFF §5 roadmap — public commons, call quality, the together room, mobile/PWA, research and discovery. E1-002 RLS still waits on Supabase staging access.

## Iteration 017 - 2026-11-18 - Server-evaluated feature flags (E0-010)

- New `src/lib/flags/`: `registry.ts` is the list of gated features (paywall, licensed catalogue, screen share, new sync transport, public commons) and each one's default is **off**, so unfinished or legally-gated work cannot leak into a deployment by accident.
- `core.ts` holds one precedence rule, highest first: `FEATURE_FLAGS=<key>=off` is an absolute kill switch, then an audited per-couple override, then `<key>=on` for everyone, then `FEATURE_FLAG_ALLOWLIST` for the staging couple, then the registry default. Unreadable entries are collected rather than applied, so a typo is reported by the tooling instead of quietly leaving a flag off.
- `server.ts` is the only place a route asks for flags. It reads the environment, the allowlist and one `kv` row per couple, and nothing from the request — no cookie, header, query or body — so a client cannot force a flag. The database read is cached per process with a 15-second TTL, which keeps a primary-key select off the hot path while an operator's change still lands promptly.
- Overrides go through `applyFlagOverride`, which writes the couple's row and appends a `flag.override` entry (key, reason, before, after) to the append-only audit log. `pnpm flags -- --list | --couple=<id> --show | --flag=<key> --on|--off|--clear` is the break-glass path and needs `FLAGS_ADMIN=1`, mirroring `pnpm entitlements`.
- Evidence: 11 new tests in `src/lib/flags/flags.test.ts` — the precedence table including kill-switch-beats-override, env and allowlist parsing with junk entries, `explainFlags` sources, a stored row containing an unknown key, and the override + audit round trip on PGlite. `pnpm typegen` pass, `pnpm typecheck` pass (3 tasks), `pnpm lint` pass, `pnpm test` pass (14 files / **100 tests**), `pnpm build` pass (36 routes). Runtime: the CLI printed the five flags with `paywall` on from the environment, `screenShare` allowlisted for one couple and `typo=maybe` reported as unreadable.
- Learnings: this sandbox intermittently denies turbo's own `apps/web/.turbo/turbo-lint.log` / `turbo-test.log` writes, which fails the run *after* the task itself succeeded — deleting the stale log makes the next run clean, and `pnpm --filter @letsvibe/web test` shows the real vitest output. `core.ts` deliberately has no `server-only` import, which is what lets the audit round trip be tested against an in-memory PGlite database.
- Docs: `AGENTS.md` lists the flags commands, `docs/RUNBOOK.md` §Incidents now names the kill switch and the per-couple command, `.env.example` documents `FEATURE_FLAGS` / `FEATURE_FLAG_ALLOWLIST`, `.loop/prd.json` marks E0-010 done. `.loop/STATUS` stays `CONTINUE`.
- Deliberately not done: no product surface consumes a flag yet. E1-016 (flag-gated paywall UI) is the first real consumer and depends on this story; inventing a consumer now would mean gating something that already works.
- Next: E0-003 CI secret scanning, dependency audit and SAST; then E2-001/E2-004 (couple_id contract and session-derived context), the gate that makes real users safe. E1-002 RLS still waits on Supabase staging access.

## Iteration 018 - 2026-11-18 - CI secret scanning, dependency audit and SAST (E0-003)

- `.github/workflows/security.yml` adds two jobs kept apart from `CI` so a security finding reads as a security finding: `secrets` runs `gitleaks/gitleaks-action@v3` over the full history (`fetch-depth: 0`) on push to `main`, every PR, a weekly cron and manual dispatch; `sast` runs the Semgrep container (`--config auto`) and uploads the SARIF artifact. Neither uses `continue-on-error`.
- `.gitleaks.toml` extends the default rules (`useDefault = true`) and suppresses nothing; the file documents that a false positive is a path-scoped allowlist entry with a reason and a real secret is rotated (H22) and purged rather than suppressed.
- The dependency audit moved out of a workflow step into `scripts/audit-deps.mjs` + `security/audit-allowlist.json` (`scope: "prod"`, `threshold: "high"`, expiring waivers with owner and reason). It fails loudly when `pnpm audit` output cannot be parsed, so an output-shape change cannot read as clean. `CI` now calls `pnpm run audit:deps`.
- Evidence: `node scripts/audit-deps.mjs` → `audit-deps scope=prod threshold=high` / ``pnpm audit --prod`` reported 0 advisories / `OK: no prod advisory at or above "high" among 193 dependencies`. A full-history sweep (`git log -p --all` for AWS/Google/GitHub/Slack/OpenAI keys, PEM keys, JWTs, `postgres://user:pass@`) returned 3 hits, all false positives (a CLI validation message and a docs list of secret *names*); the only `.env`-like file ever added is `.env.example`.
- Honest limits: gitleaks and Semgrep are not installed on the Windows dev machine (H1), so those two jobs are verified as CI artifacts, not executed locally. The Semgrep job is a reporting baseline, not yet a blocking gate.
- Docs: `docs/SECURITY.md` gains §Secret scanning and §Dependency audit policy; `AGENTS.md` lists `pnpm audit:deps`; `.loop/prd.json` marks E0-003 done.
- Next: E2-001 (`couple_id` on every couple-owned table) then E2-004 (session-derived couple context) — the code-level half of tenant isolation that is testable locally on PGlite.
