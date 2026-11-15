# Verification and claims ledger

Last updated: 2026-11-15. Rule: a claim is VERIFIED only if it was read from an official primary source or produced by a command whose output is recorded here. Everything else is UNVERIFIED and must not be stated as fact in copy, store listings or docs.

## Environment of record

- Windows (PowerShell 5.1), git 2.53.0, Node v24.16.0, npm 11.13.0, pnpm 12.21.0 via a corepack user shim (`%LOCALAPPDATA%\corepack`, not on the default PATH).
- Repo `hassan200503/our-universe`, branch `autonomous/couples-v2`, based on `main` @ `ebd08c4`.
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
- No performance, battery, accessibility or device-compatibility results exist yet.

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
| E1-001 | — | _pending_ |
| E1-002 | — | _pending_ |
| E1-003 | — | _pending_ |

Append one row per completed story; never delete past rows.
