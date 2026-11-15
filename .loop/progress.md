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
