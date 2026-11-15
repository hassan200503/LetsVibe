<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Let'sVibe — agent guide

A private shared world for couples: messages, calls, rooms, memories, gallery, daily questions, learning and research. Becoming multi-tenant (thousands of couples) on web + iOS/Android. Read `MASTER_SPEC.md`, `PROMPT.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `.loop/audit.md` and `.loop/prd.json` before starting.

## Commands (run from repo root)

```powershell
npm ci                     # install (use pnpm only after E0-002 lands)
npx next typegen           # REQUIRED on a fresh checkout before typecheck
npm run dev                # local dev; zero-setup PGlite in .data/
npm run typecheck          # tsc --noEmit
npm run lint               # eslint
npm test                   # vitest
npm run build              # production build
npm run seed               # seed local demo data
```

A change is done only when typegen, typecheck, lint, test and build pass. In the loop, record real output; never claim a gate you did not run. CI is `.github/workflows/ci.yml`.

## Layout

- `src/app` — App Router pages and `api/*` route handlers.
- `src/components` — UI (client components under feature folders).
- `src/lib` — domain/service layer: `db/` (Drizzle schema), `actions/` (server actions), `auth/`, `chat/`, `calls/`, `together/`, `media/`, `trends/`, `research/`, `journey/`.
- `src/lib/db/schema.ts` — all 32 tables and indexes; migrations in `drizzle/`.
- `docs/` — product/architecture/security/privacy/compliance/runbook/verification, ADRs.
- `.loop/` — loop bookkeeping: `audit.md`, `prd.json`, `progress.md`, `HUMAN_TASKS.md`; `STATUS` and `logs/` are git-excluded.

## Non-negotiable rules

1. **Tenancy:** every couple-owned table has `couple_id`. Derive the couple from the verified session, never from request input. RLS is default-deny; a query without explicit couple scope is a bug. New tables require policies plus a cross-couple test (E12-004). Never trust a client-supplied relationship/couple id.
2. **Visibility:** use the single `visibleTo()` gate for personal content. Public profiles are opt-in and expose only allowed fields.
3. **Secrets:** only `.env.example` may be committed. Never print, commit or log keys, tokens, passcodes or personal content. Never touch production, never `git push`, never rewrite history.
4. **Time:** use the couple's time zone, not Nairobi or server-local time. Dates on the wire are UTC.
5. **Media:** couple-scoped paths (`<couple_id>/…`); signed URLs only; validate MIME and size server-side; strip EXIF. No YouTube downloads, no DRM workarounds, no offline caching of streamed content.
6. **Realtime:** durable write first, then broadcast. Never add a new poll that writes on every tick. Keep a polling fallback while migrating.
7. **Docs:** update `docs/PARITY.md` and the relevant docs when behaviour changes. One story per iteration; commit with a conventional message.

## Known gotchas

- `npm run typecheck` fails on a clean checkout until `npx next typegen` runs (`PageProps`, `LayoutProps`, `RouteContext`). CI already does this.
- Local DB is PGlite in `.data/`; it allows one process at a time. Stop `npm run dev` before running scripts that open the DB.
- Next may warn that `package-lock.json` is outside the git repo (`C:\Users\kkc36`); set `turbopack.root` (E0-007) rather than ignoring it.
- Windows PowerShell: chain with `;` not `&&`; quote paths with spaces; use `&` for executables.
- `vitest.config.mts` uses `__dirname`; Vite's native config loader will need `import.meta.dirname`.
- The current Next 16.3.6 has a critical advisory; `npm audit` is expected to be noisy until E0-004.
- Legacy `photos` stores base64 in Postgres; new media must use Storage. Legacy polling in chat/room/calls writes on each tick — do not copy that pattern.
- Tests: `npm test` covers only trends/visibility/clock/verses/push/research parsing today; add tests with every rewrite.

## Loop contract

Branch `autonomous/*` only. Never push. One story per iteration, gates green, commit, write `CONTINUE` (or `COMPLETE` / `BLOCKED_ON_HUMAN`) to `.loop/STATUS`. Human-only tasks live in `.loop/HUMAN_TASKS.md`; mark the story blocked rather than guessing legal, billing or store decisions.
