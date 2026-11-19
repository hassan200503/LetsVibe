<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lovora — agent guide

A private shared world for couples: messages, calls, rooms, memories, gallery, daily questions, learning and research. Becoming multi-tenant (thousands of couples) on web + iOS/Android. Read `MASTER_SPEC.md`, `PROMPT.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `.loop/audit.md` and `.loop/prd.json` before starting.

## Commands (run from repo root)

Requires Node.js 24+ and pnpm 12.21.0. If `pnpm` is missing, run `corepack enable pnpm` once.

```powershell
pnpm run setup                 # fresh clone: install, typegen and seed Alex + Sam
pnpm reset                 # clear local data; begin at /welcome
pnpm install               # install the workspace
pnpm typegen               # REQUIRED on a fresh checkout before typecheck
pnpm dev                   # web dev server; zero-setup PGlite in apps/web/.data/
pnpm typecheck             # typegen + tsc --noEmit across packages
pnpm lint                  # eslint
pnpm test                  # vitest
pnpm a11y                  # axe WCAG audit against a seeded app on :3100
pnpm motion                # reduced-motion, flashing and forced-colours audit on :3100
pnpm build                 # production build
pnpm audit:deps            # dependency-audit policy in security/audit-allowlist.json
pnpm review:agent -- --no-ai   # heuristic code review of the branch diff; add a Gemini key for the model pass
pnpm triage:agent -- --log <file>   # turn a saved gate log (or --run <gate>) into a ranked repair plan under .loop/triage/
pnpm seed                  # seed local demo data
pnpm entitlements -- --couple=<id|name> --show   # break-glass; needs ENTITLEMENTS_ADMIN=1
pnpm flags -- --list                            # every feature flag and its default
pnpm flags -- --couple=<id|name> --show         # why each flag is on or off for one couple
```

A change is done only when typegen, typecheck, lint, test, build and the production audit pass. In the loop, record real output; never claim a gate you did not run. CI is `.github/workflows/ci.yml`; the required check is `CI / check`. Use `.github/pull_request_template.md` for evidence, parity, risk and rollback.

## Layout

- `apps/web/src/app` — App Router pages and `api/*` route handlers.
- `apps/web/src/components` — UI (client components under feature folders).
- `apps/web/src/lib` — domain/service layer: `db/` (Drizzle schema), `actions/` (server actions), `auth/`, `chat/`, `calls/`, `together/`, `media/`, `trends/`, `research/`, `journey/`.
- `packages/domain` — framework-free product/domain code shared by web and future mobile; currently the brand constants.
- `packages/ui-tokens` — semantic colour, type, spacing, radius, elevation and motion tokens shared by web and future mobile; `tokens.css` is generated from `src/tokens.ts`.
- `packages/config` — shared TypeScript base config.
- `apps/web/src/lib/db/schema.ts` — all 38 tables and indexes; migrations in `apps/web/drizzle/`.
- `apps/web/public` — PWA manifest assets and the push service worker.
- `docs/` — product/architecture/design/security/privacy/compliance/runbook/verification, ADRs.
- `.loop/` — loop bookkeeping: `audit.md`, `prd.json`, `progress.md`, `HUMAN_TASKS.md`; `STATUS` and `logs/` are git-excluded.

## Non-negotiable rules

1. **Tenancy:** every couple-owned table has `couple_id`. Derive the couple from the verified session, never from request input. RLS is default-deny; a query without explicit couple scope is a bug. New tables require policies plus a cross-couple test (E12-004). Never trust a client-supplied relationship/couple id.
2. **Visibility:** use the single `visibleTo()` gate for personal content. Public profiles are opt-in and expose only allowed fields.
3. **Secrets:** only `.env.example` may be committed. Never print, commit or log keys, tokens, passwords, recovery codes or personal content. Never touch production, never `git push`, never rewrite history.
4. **Time:** use the couple's time zone, not Nairobi or server-local time. Dates on the wire are UTC.
5. **Media:** couple-scoped paths (`<couple_id>/…`); signed URLs only; validate MIME and size server-side; strip EXIF. No YouTube downloads, no DRM workarounds, no offline caching of streamed content.
6. **Realtime:** durable write first, then broadcast. Never add a new poll that writes on every tick. Keep a polling fallback while migrating.
7. **Docs:** update `docs/PARITY.md` and the relevant docs when behaviour changes. One story per iteration; commit with a conventional message.

## Known gotchas

- `pnpm typecheck` fails on a clean checkout until `pnpm typegen` runs (`PageProps`, `LayoutProps`, `RouteContext`). The root script runs typegen first; CI does too.
- Local DB is PGlite in `apps/web/.data/`; it allows one process at a time. Stop `pnpm dev` before running scripts that open the DB.
- pnpm is strict: add every runtime import to the owning package's `dependencies`, not to the repo root. Workspace packages export TypeScript source and are transpiled by Next (`transpilePackages`).
- If `pnpm` is not on PATH, use `corepack pnpm`; Turborepo still needs a `pnpm` binary on PATH. On Windows without admin rights, create shims in a user directory with `corepack enable --install-directory "$env:LOCALAPPDATA\corepack"` and add that directory to PATH.
- Windows PowerShell: chain with `;` not `&&`; quote paths with spaces; use `&` for executables. Prefer Node/UTF-8 for bulk text edits.
- `vitest.config.mts` resolves the `@` alias from its own directory with `import.meta.dirname`.
- Next 16.4.6 is patched for the critical advisories. `pnpm audit --prod` is clean; only two moderate dev-tool findings remain (esbuild via drizzle-kit, minimatch via ESLint).
- Legacy `photos` stores base64 in Postgres; new media must use Storage. Legacy polling in chat/room/calls writes on each tick — do not copy that pattern.
- Tests: `pnpm test` covers only brand, trends/visibility/clock/verses/push/research parsing today; add tests with every rewrite.
- `pnpm run setup` seeds fictional demo people (Alex and Sam). There is no personal seed data; never add real people or private details to it.

## Loop contract

Branch `autonomous/*` only. Never push. One story per iteration, gates green, commit, write `CONTINUE` (or `COMPLETE` / `BLOCKED_ON_HUMAN`) to `.loop/STATUS`. Human-only tasks live in `.loop/HUMAN_TASKS.md`; mark the story blocked rather than guessing legal, billing or store decisions.
