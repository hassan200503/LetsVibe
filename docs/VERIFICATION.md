# Verification and claims ledger

Last updated: 2026-11-18. Rule: a claim is VERIFIED only if it was read from an official primary source or produced by a command whose output is recorded here. Everything else is UNVERIFIED and must not be stated as fact in copy, store listings or docs.

## Environment of record

- Windows (PowerShell 5.1), git 2.53.0, Node v24.16.0, npm 11.13.0, pnpm 12.21.0 via a corepack user shim (`%LOCALAPPDATA%\corepack`, not on the default PATH).
- Local checkout of the `our-universe` repository, branch `autonomous/couples-v2`, based on `main` @ `ebd08c4`.
- No production access, no deployments, no mobile builds and no device tests were performed.

## External claims

| # | Claim | Status | Source (official) | Checked | Notes |
| --- | --- | --- | --- | --- | --- |
| V1 | Supabase Realtime limits: Free 200 connections / 100 msg/s / 100 joins/s; Pro default 500 / 500 / 500; Pro without spend cap 10,000 / 2,500 / 2,500; Team 10,000 / 2,500 / 2,500 | **VERIFIED** | https://supabase.com/docs/guides/realtime/rate-limits | 2026-11-15 | The default Pro cap cannot support 1,500 concurrent users |
| V2 | Spotify Development Mode: owner needs Premium; max 5 authenticated users; Extended Quota requires an organisation with a launched service and ≥250,000 MAU (since 2025-05-15) | **VERIFIED** | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | 2026-11-15 | Reason for excluding Spotify |
| V3 | YouTube API Services policies: official minimum functionality; no downloading/caching/backup/offline playback; no ad alteration; no infringement facilitation; link YouTube ToS and provide privacy policy | **VERIFIED** | https://developers.google.com/youtube/terms/developer-policies | 2026-11-15 | Build must use the official player only |
| V4 | YouTube background-play and exact player UI requirements | **UNVERIFIED** | https://developers.google.com/youtube/terms/required-minimum-functionality | — | Verify before E5-009; do not claim background audio |
| V5 | Google Play: from 2026-08-31 new apps and updates must target Android 16 (API 36); extension to 2026-11-01 | **VERIFIED** | https://support.google.com/googleplay/android-developer/answer/11926878 | 2026-11-15 | Applies to the Expo/RN target |
| V6 | Google Play: 16 KB page-size support and 12-tester/14-day closed-testing rule for personal accounts | **UNVERIFIED** | Play Console help (not fetched) | — | Verify before E8-010/E13-006 |
| V7 | Apple Guideline 1.2 UGC: filtering, reporting with timely response, blocking, published contact info | **VERIFIED** | https://developer.apple.com/app-store/review/guidelines/ | 2026-11-15 | Evidence pack required |
| V8 | Apple Guideline 4.8: apps with third-party login must offer an equivalent privacy-preserving login (Sign in with Apple) | **VERIFIED** | same | 2026-11-15 | Must ship Apple sign-in on iOS |
| V9 | Apple Guideline 5.1.1(v): apps with account creation must offer in-app account deletion | **VERIFIED** | same | 2026-11-15 | Deletion on web and native |
| V10 | Apple 1.2 NCII extension dated 2026-10-16 (per MASTER_SPEC) | **UNVERIFIED** | same | — | Re-read current text (H20) |
| V11 | Kenya Data Protection Act / ODPC registration, cross-border transfer, DPIA, breach deadline | **UNVERIFIED** | Kenyan official sources not fetched | — | Legal memo (H7) |
| V12 | Jamendo free tier is non-commercial; per-track CC licences and attribution requirements | **UNVERIFIED** | Jamendo terms not fetched | — | Blocking for E5-006 (H10) |
| V13 | LiveKit Cloud pricing (5,000 free participant-minutes; Ship $50/150,000) | **UNVERIFIED** | not fetched | — | Not load-bearing for v1 (P2P) |
| V14 | Expo/React Native version supports API 36 and 16 KB pages | **UNVERIFIED** | not fetched | — | Pin and verify in E8-010 |
| V15 | Supabase Realtime private-channel authorization via RLS on `realtime.messages` | **UNVERIFIED** | https://supabase.com/docs/guides/realtime/authorization (not fetched) | — | Read before E3-001 |
| V16 | Supabase Realtime plan pricing | **UNVERIFIED** | not fetched | — | Budget approval H3 |

## Baseline gates (2026-11-15)

Commands were run from the repo root after `npm ci` on a clean checkout. These are the only gate results claimed for this iteration; nothing in the app code was changed by Phase 0.

| Command | Result | Recorded detail |
| --- | --- | --- |
| `npm ci` | PASS | 568 packages. `npm audit`: 23 vulnerabilities — 1 critical, 8 high, 13 moderate, 1 low. |
| `npm run typecheck` | FAIL | Missing Next generated types (`PageProps`, `LayoutProps`, `RouteContext`) before typegen. |
| `npx next typegen` | PASS | Generates the missing types. CI already runs this. |
| `npm run typecheck` (after typegen) | PASS | No errors. |
| `npm run lint` | PASS | No findings. |
| `npm test` | PASS | 4 test files, 41 tests. Config uses `__dirname` (future Vite loader warning). |
| `npm run build` | PASS | Next 16.3.6 Turbopack. Warning: `package-lock.json` at `C:\Users\kkc36` is outside the git repo; set `turbopack.root`. |

Dependency audit: critical `next@16.3.6` (fix `next@16.4.6`); high `@vercel/blob` chain (suggested fix `@vercel/blob@2.4.0`, semver-major), `sharp`, `source-map-js`, `undici`, `vite`; moderate/low as reported by npm. Counts and fixes change over time — rerun and re-record.

### Current dependency state (after E0-004, 2026-11-15)

- `next` and `eslint-config-next` are 16.4.6; `pnpm audit --prod` reports **no known vulnerabilities**.
- `pnpm audit` reports two moderate **dev-only** findings: `esbuild <=0.24.2` via `drizzle-kit`'s legacy `@esbuild-kit` chain, and `minimatch <11.0.1` via ESLint tooling. Neither is shipped; documented in `docs/SECURITY.md` and revisit when upstream tools update.
- `zod` is overridden to 4.6.7 in `pnpm-workspace.yaml` (pnpm 12 no longer reads `pnpm.overrides` in `package.json`) to replace the 4.1.11 pin under `@vercel/cli-config` (GHSA-mrhx-c7xc-m3w5).

Current tests cover: trends engine, visibility/clock/verse logic, push key derivation, research parsing. No tests cover auth, chat, calls, room sync, gallery, storage or tenancy.

## Secret scan

- Tool `gitleaks`: **NOT INSTALLED**, so no entropy-based scan was performed.
- Manual: `git rev-list --all --objects` lists only `.env.example`; no `.env*` or `PASSCODES*.md` in history. `git log -S` for `AIza`, `ghp_`, `sk_live`, `BEGIN RSA PRIVATE KEY`, `DATABASE_URL=postgres` found no commits.
- Working tree secret patterns: none observed; only files containing the words secret/passcode in code/tests/docs.
- Residual risk: pattern search can miss novel secrets. Add gitleaks in CI (E0-003) and rotate anything found (H24).

## Verification still required before each milestone

| Milestone | Must verify | Method |
| --- | --- | --- |
| M0 | pnpm monorepo, gitleaks, audit patch, staging/prod separation | CI runs, staging deploy, audit report |
| M1 | Supabase Auth, claim flow, RLS on identity tables, cross-couple tests | Staging walkthrough + pgTAP output + Playwright traces |
| M2 | Realtime channels, chat/call/room under load | Load tests at 1,500 users; Supabase metrics; two-device calls |
| M3 | Storage policies, uploads, quotas, moderation, AI quotas | Policy tests, quota boundaries, provider sandbox, cost report |
| M4 | iOS/Android builds, push, calls, API 36/16 KB | Physical devices, TestFlight/Play internal, pre-launch report |
| M5 | Store compliance evidence, legal memos, deletion/export | Review-style walkthrough, recordings, signed memos |
| M6 | SLOs, backups, DR, cost, accessibility | Drill reports, load tests, audit reports |

## Unverified / assumptions to keep labelled

- Scale figures (10,000 couples, 20,000 users, 1,500 concurrent, 300 rooms, 150 calls) are planning assumptions from MASTER_SPEC, not measured.
- Storage per couple (1 GB average), TURN failure rate (10–20%), AI usage per couple and message rates are assumptions for sizing; validate in E11-001/E11-005.
- Legal positions for Kenya, CSAM reporting, music licensing and accessibility law require counsel.
- Store rules change; re-read Apple/Google/YouTube before submission.
- No performance, battery, native accessibility or device-compatibility results exist yet.

## How to reproduce and record

1. Record date, branch, commit, OS and tool versions.
2. Run the gate commands and paste the exact result (pass/fail, counts, warnings). Do not paraphrase a failure as a pass.
3. For external claims, save the URL, access date and the quoted sentence in the PR or evidence file.
4. For staging tests, attach trace/screenshot/video references without personal data.
5. Update this file and `docs/PARITY.md` in the same story that changes behavior.

## Story evidence log

| Story | Date | Evidence |
| --- | --- | --- |
| E0-001 | 2026-11-15 | This file, `.loop/audit.md`, `docs/PARITY.md`, `docs/adr/001-stack.md`, `prd.json`; baseline gate table above |
| E0-002 | 2026-11-15 | Monorepo move; gates in `.loop/progress.md` iteration 003; commit `2d46139` |
| E0-003 | — | _pending (gitleaks H1)_ |
| E0-004 | 2026-11-15 | Next 16.4.6; prod audit clean; dev-only 2 moderate; gates in `.loop/progress.md` iteration 004 |
| E0-007 | 2026-11-15 | Fresh-workspace `pnpm run setup`; generic Alex/Sam seed idempotent; gates in `.loop/progress.md` iteration 005 |
| E1-001 | 2026-11-16 | `0006_identity.sql` rename/backfill plus `identity.test.ts` and `identity-migration.test.ts`; `pnpm check` 7 files / 51 tests, 34 pages; `db:generate` clean; seed/reset pass; staging rehearsal pending E0-006 |
| E1-012 | 2026-11-17 | `0007_mysterious_puff_adder.sql` adds `entitlements`, monthly `usage_ledger`, append-only `audit_log` and free-plan backfill. Six PGlite tests cover defaults, storage incl. base64 photos, AI quota boundary/idempotency, room disable, audited overrides and validation. Enforcement at presigned/local upload, avatar, AI reservation and room access; Settings/Gallery/Research show usage and clear exhausted/excluded states. `pnpm check` 10 files / 64 tests, 35-route build; axe 0 violations on `/`, `/research`, `/gallery`, `/together`, `/settings`; local screenshots verified normal and limit states, demo restored. |
| E7-003 | 2026-11-17 | `0008_jittery_ultragirl.sql` adds model, prompt/completion/total token and estimated cost columns to `usage_ledger`. Research streaming and quiz generation record Gemini `usageMetadata` (thinking counted as output) against the reserved question, with per-model rate estimates and reset guidance on quota refusal (quiz returns 429). BYO Gemini keys are namespaced per couple, AES-256-GCM sealed, hint/by/at only in Settings, never returned to clients; env key still wins. PGlite metering/cost/cross-couple tests + seal round-trip/tamper/namespace tests; `pnpm check` 11 files / 67 tests, 35-route build; axe 0 violations on `/settings` and `/research` in light and dark; desktop/mobile plan section screenshots verified. |
| E10-005 | 2026-11-17 | Global `prefers-reduced-motion: reduce` rule forces all animation/transition durations to 0.01 ms and disables smooth scrolling, including Tailwind utilities; ambient CSS remains behind `no-preference`. Forced-colours fallbacks restore gradient text, card/button/chip edges and a 2 px Highlight focus outline, and hide decorative aurora/stars/petals/grain. New `pnpm motion` audits login + 6 routes for reduced-motion leaks, infinite animations under 333 ms, invisible gradient text, axe WCAG 2.2 AA (contrast off) under forced colours and 3 keyboard focus stops per route: **0 findings**; 5/5 axe routes still 0 in light and dark; forced-colours screenshots inspected; detectors self-checked with injected motion and real media emulation. |
| E7-004 | 2026-11-18 | `src/lib/research/safety.ts` fences retrieved study/web extracts (body has every run of two or more `<` rewritten, so quoted text cannot close the fence), detects crisis in sentence scope behind a first-person gate, prunes citations to retrieved source numbers, guards the streamed answer for prompt leaks / obeyed injections / unsafe text, and logs metadata only. Gemini requests send explicit safety settings and treat `promptFeedback.blockReason` or a safety `finishReason` as blocked. The server streams a `safety` event (crisis routes to external resources before key/quota/model calls); the client renders `safety-card.tsx` as `role="alert"` and drops a thread that never received a message. 6 new unit tests (11 files / 73 tests); `pnpm check` PASS with a 35-route production build; `pnpm a11y` 0 violations and `pnpm motion` 0 findings on 7 routes in light and dark. |
| E1-002 | — | _pending_ |
| E1-003 | — | _pending_ |
| E0-008 | 2026-11-16 | CI gate + PR template; YAML parse, frozen install, `pnpm check` (44 tests, 34 pages) and prod audit recorded in `.loop/progress.md` iteration 007; branch protection H30 and GitHub median runtime still pending |
| E1-013 | 2026-11-16 | Neutral theme/identity refactor; name search clean; onboarding/invite Playwright run; `pnpm check` in `.loop/progress.md` iteration 006 |
| E9-011 | 2026-11-16 | Production-mode local header check: nonce CSP, HSTS, DENY, nosniff, referrer, permissions, Reporting-Endpoints; CSP report endpoint 204 with sanitised log; no ACAO header; 7 new tests, full gate 9 files / 58 tests / 35 routes. External scan and browser YouTube exercise pending deploy. |
| E0-009 | 2026-11-17 | `@letsvibe/ui-tokens` typed source plus committed generated `tokens.css`, consumed by web CSS, themeColor and manifest; Turbo freshness check passes. Authenticated production computed-style diff vs `8e4496c`: home and chat in light and dark, 0 diffs. Reduced motion: base/fast `.01ms`, `.btn`/`.field` transitions `1e-05s`, ambient shimmer `none`. Hardcoded-value removal plan in `docs/DESIGN.md`. `pnpm check`: typegen, 4-package typecheck, lint clean, 9 files / 58 tests, 35-route build. |
| E10-001 | 2026-11-17 | `pnpm a11y` runs axe-core 4.14 against a seeded production build. Light and dark: **0 WCAG 2.2 A/AA violations** on `/`, `/together/chat`, `/together`, `/gallery`, `/settings`. Fixed gold small-text contrast via `--gold-ink`, sage accent contrast, unlabeled file inputs, ARIA on presence/status elements, settings link underline, and hidden file inputs in the tab order. Keyboard audit recorded 19-24 visible focus stops per screen. Scope/exceptions and date in `docs/DESIGN.md`; `pnpm check` 9 files / 58 tests / 35 routes, lint clean. |
| E2-003 | 2026-11-19 | Written as a generated Vitest matrix over the real migrated schema (PGlite) rather than pgTAP, because the project runs one Postgres engine (PGlite in tests and local dev, Neon in production) and a Supabase pgTAP harness would sit outside the `pnpm test` gate — the deviation is recorded in the `prd.json` notes. `src/lib/db/tenancy-matrix.test.ts` registers all 21 couple-owned tables with a key, a touch column and an insert builder, then proves per table: couple B cannot select couple A's existing row even holding its keys, an insert carries exactly the writing couple, and a wrong-tenant update/delete matches 0 rows and leaves the other couple's row byte-identical while the same statement from the owning couple lands. Coverage guards compare the registry against `information_schema.columns` so a new `couple_id` table fails CI until it is registered, and assert `couple_id` is never nullable, no `relationship_id` survives, every table has a real FK, and the 5 composite-FK children refuse cross-couple writes. `src/lib/media/storage.test.ts` proves `ownsPath` rejects other couples' folders, lookalike prefixes, `..` traversal, absolute paths, backslashes, spaces and `%00`, that `newPath` stays inside the couple folder, and that a blob signature is bound to its path; `src/app/api/media/file/[...path]/route.test.ts` proves the download refusal is ownership and not absence (the other couple gets the same file when they ask) plus 401 when signed out. `pnpm check` PASS: typecheck, lint, **19 files / 225 tests**, 36-route production build. Commit `17bec37`. |
| E2-005 | 2026-11-19 | Two independent boundaries, each proven. **Reachability:** migration `0012_great_tombstone.sql` moves the URL slug to `couple_members` (`unique(couple_id, slug)`, so two couples can both have an "alex") and gives public profiles an opaque `people.public_handle` minted only on opt-in, with a DB check that a public profile always has one. `people.slug` stays the sign-in handle and stops appearing in any URL. **Content:** `src/lib/public-profile.ts` is the only reader, with an explicit column allowlist per table; `/p/[handle]` is `noindex`. `src/lib/public-profile.test.ts` (8 tests) proves: unreachable while opted out even with a handle present; the account slug and member slug never resolve; the returned object's keys are exactly the allowlist + handle + skills + projects (nickname, birthday, focus, motto, slug, passwordHash, avatarPath all absent); only `visibility = 'public'` skills and projects are returned, with shared/private rows absent from the serialised payload; switching off makes the handle 404 and switching back on restores the same link; edits after publish are reflected; handles are 22-char base64url and distinct; empty/oversized/unknown handles are refused. API surface audited in the same pass: every trends read now takes an explicit `viewers` (this couple's members) so reaction decoration is narrowed in SQL, the discover-item notes query scopes `person_id` with `inArray` instead of filtering after the fact, and gallery reactions/member slugs resolve through `ctx.members` rather than a joined account slug. The ambiguous `/p/[slug]` route was deleted (Next refused the build with two dynamic segments). `pnpm typecheck` PASS, `pnpm lint` PASS, `pnpm test` **20 files / 234 tests**, `pnpm build` PASS (36 routes). |
| E5-013 | 2026-11-19 | New `packages/sync-protocol` (pure TS, zero runtime deps, exported via `src/index.ts` and transpiled by Next) owns the sync rules: `PlaybackSnapshot`/`SyncEvent` with server-assigned `seq`; `applyEvent` ignores `seq <= state.seq` (idempotent replay); `expectedPositionMs`; fastest-RTT `estimateClock` over the last 12 samples; `planCorrection` with hold <150 ms / rate nudge 150-1000 ms (5%, 10% catching up) / seek >=1000 ms or when the player cannot rate-shift; `heartbeatDue` 5 s. Deterministic simulator (`simulateRoom`) advances 25 ms of virtual time over two clients with skewed clocks (+37 s/-12 s), media-clock bias (+0.12%/-0.09%), bootstrap pings, 1 s polls, per-message jitter, loss, retrying/deduped controls and buffering stalls; PRNG is mulberry32, so the same seed reproduces the run exactly. **Measured seed 7, 95 s:** wifi p50 13 / p95 295 / max 559 ms; mobile p95 280; poor p95 326; **33% loss** p95 286 with delivery recovered. All under the 500 ms p95 target. Package tests: 4 clock + 8 state/correction + 6 simulator = **18 passing**, including a determinism test and a test that asserts a seek's spike shows in `worstMs` while p95 stays clean. `apps/web/src/components/together/room-provider.tsx` now uses `addSample`/`estimateClock`/`expectedPositionMs`/`planCorrection`/`toSeconds`; buffer-aware gating, two-consecutive-over-threshold seeks, `canJump` and seek backoff are unchanged. Gates: `pnpm typecheck` PASS (4 packages), `pnpm lint` PASS, `pnpm test` 20 files / 234 web tests + 18 package tests, `pnpm build` PASS (36 routes). Rows 12/16 of PARITY updated to cite the package. |
| E3-007 | 2026-11-19 | Chat photos and voice notes reuse the existing couple-scoped media pipeline instead of a second uploader: `media.origin` (`gallery` \| `chat`, migration `0013_foamy_stephen_strange.sql`, defaulting to gallery) is a storage-level split, and `galleryPage`, `unseenCount`, `mediaByIds` and recents filter on it, so an attachment sent in Messages is never listed as a gallery post. Photos go through the existing WebP re-encode and thumbnail path; a voice note is MediaRecorder audio stored as `song` with `duration_sec` and 48 peaks kept in `messages.meta.peaks` (capped by `MAX_PEAKS`). The send action accepts an empty body only with an attachment and re-checks everything server-side: the media row must be this couple's, uploaded by the sender, `origin = chat`, not already referenced by another message, and at most five minutes. The clientId lookup happens before that validation, so a retry after a lost reply returns the stored message rather than a validation error or a duplicate. Delete-for-everyone clears the meta and removes both the media row and its stored object; delete-for-me keeps the file for the partner. UI (`components/chat/attachments.tsx`): inline waveform with progress, click/arrow-key seek, 1x/1.5x/2x, one voice note playing at a time, photo thumbnail with a lightbox, composer draft preview with upload progress and cancel, and a recording bar with a live level meter and a five-minute cap. Tests: `src/lib/chat/attachments.test.ts` (7 PGlite integration tests over the real migrations: send and signed URL, idempotent retry, already-sent refusal, cross-couple and partner-upload refusal, request schema with neither body nor attachment, both delete scopes, gallery exclusion) and `src/components/chat/attachments.test.ts` (6 waveform tests: empty input, 48 bars, bucket averaging and normalization, silent floor, bounds, fewer samples than bars). Gates: `pnpm typecheck` PASS (4 packages), `pnpm lint` PASS, `pnpm test` **22 files / 247 web tests** + 18 package tests, `pnpm build` PASS (36 routes). |
| E17-002 | 2026-11-19 | `pnpm review:agent` reviews the branch diff (`base...HEAD` plus working tree and staged changes, base auto-detected from `origin/main`) and the newest `.loop/logs/*.log` gate output, then writes `.loop/reviews/agent-review-<stamp>.md` and `latest.md`; it has no write path outside `.loop/` and exits non-zero only on a critical finding. The offline heuristic pass is pure TypeScript (`apps/web/src/lib/agent/review.ts`) and covers secrets in the diff (private keys, Google/Slack/GitHub/AWS/Vercel tokens, passwords in Postgres URLs) with matched values never echoed, `dangerouslySetInnerHTML`/`eval`/`new Function`, sensitive logging, `passwordHash` escaping into responses, images without alt text, clickable non-interactive elements, destructive migrations, `Math.random` in the sync protocol, cross-tenant queries whose hunk lacks a couple/visibleTo/ctx scope, and source changes with no accompanying test. The Gemini pass fences the diff and gate output as untrusted, caps their size, asks for fenced JSON, sanitises every field, caps at 50 findings and degrades to heuristics when the key or network is missing. Evidence: `review.test.ts` 19 fixture tests pass; the command on this branch reports **220 files changed, 0 critical · 0 high · 0 medium · 0 low**, exit 0; `pnpm typecheck` PASS (4 packages), `pnpm lint` PASS, `pnpm test` **23 files / 266 web tests** + 18 package tests, `pnpm build` PASS. `gitleaks` is not installed in this environment; the diff secret rule is the recorded substitute. |

Append one row per completed story; never delete past rows.
