# Phase 0 audit — Our Universe

- Date: 2026-11-15
- **Historical snapshot of the pre-implementation codebase.** Rows describing slug/passcode auth, seed-only accounts and Supabase plans are superseded by the current implementation; see `docs/adr/004-lovora.md`, `docs/adr/005-first-party-auth.md` and `docs/SECURITY.md`.
- Branch: `autonomous/couples-v2` (branched from `main` at `ebd08c4`)
- Audited checkout: clean working tree before this bootstrap.
- Method: read source; ran install, typecheck, lint, tests and build; scanned git history manually (gitleaks not installed).

## 1. Stack and versions

| Layer | What it uses today | Version |
| --- | --- | --- |
| Web framework | Next.js App Router (Turbopack build), React Compiler enabled | next 16.3.6, react 19.2.8 |
| Language | TypeScript, `strict: true` | typescript ^5 (5.9.x resolved) |
| Styling | Tailwind CSS v4 + a large hand-written design system in `src/app/globals.css` | tailwindcss ^4 |
| Fonts | `next/font/google`: Inter, Fraunces, Cormorant Garamond, JetBrains Mono | via next/font |
| ORM / DB | Drizzle ORM; Neon serverless driver over WebSocket when `DATABASE_URL` is Neon; node-postgres otherwise; embedded PGlite locally | drizzle-orm ^0.45.3, @neondatabase/serverless ^1.1.0, pg ^8.23.0, @electric-sql/pglite ^0.5.8 |
| Media storage | Vercel Blob private store (browser-direct uploads, signed reads); local filesystem fallback | @vercel/blob ^2.8.0 |
| Auth | Custom JWT cookie (jose HS256), bcryptjs cost 12, slug + passcode | jose ^6.2.12, bcryptjs ^3.0.3 |
| Realtime | None: HTTP polling for chat, rooms, calls and presence | — |
| Push | Web Push (VAPID derived from deployment secret) | web-push ^3.6.7 |
| Calls | Peer-to-peer WebRTC; handshake relayed through Postgres rows polled by both phones | browser APIs |
| AI research | Gemini REST API + OpenAlex; no SDK | fetch |
| Data fetching | TanStack Query on the client; server components/actions | @tanstack/react-query ^5.104.0 |
| Validation | Zod | zod ^4.6.5 |
| Tests | Vitest, node environment, 4 test files | vitest ^5.0.2 |
| Lint | ESLint 9 flat config (`eslint-config-next`) | eslint ^9 |
| CI | GitHub Actions: typegen → typecheck → lint → test; separate scheduled ingest | `.github/workflows/` |

Repo size: 202 tracked files. `src/`, `scripts/`, `drizzle/` contain 165 `.ts/.tsx/.mjs/.sql` files and 16,767 lines by a PowerShell line count (the README's ~18,700 figure includes the files whose bracket paths the quick count skipped). No `node_modules`, build output or secrets are tracked.

## 2. Entry points

- Web UI: `src/app/layout.tsx` (root providers: pulse, calls, room player, nav, push) and `src/app/page.tsx` (home).
- Route handlers: `src/app/api/{chat,call,call/ice,pulse,room,push,gallery,media/*,photos,research,trends,cron/ingest}/route.ts`.
- Server actions: `src/lib/actions/{auth,media,personal,secrets,shared,together,util}.ts`.
- Auth gate: `src/proxy.ts` (optimistic cookie redirect; real verification in `src/lib/context.ts`).
- Local scripts: `scripts/{seed,migrate,ingest,retag,passcodes,go-live}.ts|mjs`.
- DB schema/migrations: `src/lib/db/schema.ts`, `drizzle/0000…0005`.

## 3. User-facing feature inventory

| Feature | Where | Notes / carry-over |
| --- | --- | --- |
| Night-stage home with rotating verse, journey clock, road ahead, moment from the journey | `src/app/page.tsx`, `src/lib/journey/verses.ts`, `src/lib/data.ts`, `src/components/home/*` | Keep identity; make data per couple. `WORLD_LINE` is hardcoded. |
| Messages: text, replies, reactions, edits (15 min), delete for me/everyone, typing, sent/delivered/read ticks, unread badges | `src/components/chat/*`, `src/lib/chat/*`, `src/app/api/chat/route.ts`, `src/app/together/chat/page.tsx` | Data model good; polling transport to replace. |
| Voice/video calls from chat, header menu, home; ringing with Web Push; call lines in chat; mute/camera/hangup data channel; ICE restart | `src/components/call/*`, `src/lib/calls/*`, `src/app/api/call/*` | P2P + TURN logic keep; signalling must leave polling. |
| Together room: synced listen/watch, YouTube IFrame or uploaded media, queue, chat/reactions/nudges, mini-player that survives navigation, volume ducking during calls | `src/app/together/page.tsx`, `src/components/together/*`, `src/lib/together/room.ts`, `src/app/api/room/route.ts` | Sync algorithm and UX keep; transport and source model change. |
| Gallery: photos/videos/songs, uploads (25/30/150 MB), comments, reactions, new badge, signed URLs | `src/app/gallery/page.tsx`, `src/components/gallery/*`, `src/lib/media/*`, `src/app/api/{gallery,media,photos}/*` | Keep; add quotas/scanning and couple storage paths. Legacy `photos` table stores base64 in Postgres. |
| Our Story: memories, milestones, adventures, plans, discoveries | `src/app/story/page.tsx`, `src/lib/actions/shared.ts`, `src/lib/data.ts` | Keep; couple-scoped already via `relationship_id`. |
| Question of the day: same question both partners, hidden until both answer, archive | `src/components/home/question-card.tsx`, `src/lib/together/{daily,questions}.ts` | Keep; time zone must become per couple (today hardcoded Nairobi +3). |
| Personal worlds: profile, journal, tech radar, skills, projects, Knowledge Vault, "thinking" journal | `src/app/world/[slug]/*`, `src/lib/worlds.ts`, `src/lib/world-page.ts`, `src/lib/actions/personal.ts` | Mostly Hassan-specific; make generic/optional. |
| Discover: For You feed, 8 topic feeds, "Something We Both Might Like" bridge, saved items, source health | `src/app/discover/*`, `src/lib/trends/*`, `src/app/api/trends/route.ts` | Global content service; per-couple topic selection needed. |
| Live Trends ingest: 39 curated RSS/iNaturalist sources, normalise, tier, dedupe, categorise, image licensing rules, retry/backoff | `src/lib/trends/{sources,ingest,enrich,refresh,topics}.ts`, `.github/workflows/ingest.yml` | Keep engine; sources are couple-specific and must become configurable. |
| Things We Are Learning | `src/app/learning/page.tsx`, `sharedLearning` table | Keep. |
| Research: Gemini answers (research/learn/explain), OpenAlex studies with citations, threads, sharing, quiz, save to learning | `src/app/research/page.tsx`, `src/components/research/*`, `src/lib/research/*`, `src/app/api/research/*` | Keep; global API key/quota must become per-user/per-couple limits. |
| Weekly digest and global search | `src/app/digest/page.tsx`, `src/app/search/page.tsx`, `src/lib/trends/query.ts` | Keep. |
| Settings: relationship dates, profile, interests, favourite/muted sources, blocked categories/keywords, passcode, Gemini key, TURN relay, push alerts | `src/app/settings/page.tsx`, `src/components/settings/*`, `src/lib/actions/{secrets,personal}.ts` | Rebuild around per-user auth and per-couple settings. |
| Opt-in public profile (skills/projects only) | `src/app/p/[slug]/page.tsx`, `visibleTo()` | Keep behind explicit opt-in; revisit global slugs. |
| PWA: manifest, service worker, Web Push, Add to Home Screen guidance, app-icon badge | `src/app/manifest.ts`, `public/sw.js`, `src/components/push.tsx`, `src/lib/push/*` | Keep for web; native push in the app. |
| Personalisation/presence: online pill, typing, nudges/invites, unread app-icon count | `src/components/{pulse,presence-pill,nav}.tsx`, `src/app/api/pulse/route.ts` | Replace polling with realtime; presence per couple. |
| Login/logout with slug + passcode | `src/app/login/*`, `src/lib/actions/auth.ts`, `src/lib/auth/session.ts` | Replace entirely (no signup/reset/recovery today). |

## 4. Data and content model

32 Drizzle tables in `src/lib/db/schema.ts`:

- Identity/relationship: `people`, `relationships`, `relationship_members`, `presence`, `chat_state`, `push_subscriptions`.
- Couple content: `memories`, `shared_learning`, `daily_answers`, `messages`, `calls`, `call_signals`, `media`, `media_reactions`, `media_comments`, `room_state`, `room_events`, `photos` (legacy base64), `research_threads`, `research_messages`.
- Personal content: `interests`, `skills`, `preferences`, `learning_records`, `projects`, `knowledge_entries`, `radar_lanes`, `radar_items`, `saved_discoveries`.
- Global content/ops: `trend_sources`, `trends`, `kv`.

Tenancy today is application-level, not database-enforced:

- Most couple tables carry an indexed `relationship_id`.
- `ctxFor()` resolves a person → their relationship → members; all reads build the relationship id from the signed session (never from the request).
- `visibleTo()` (`src/lib/context.ts:71`) is the single private/shared/public gate for personal content.
- Media objects live under `rel/<relationshipId>/…`; `ownsPath()` checks the prefix before upload (`src/lib/media/storage.ts:64`).
- Chat sends are idempotent via a device-generated `client_id` with a unique `(relationship_id, client_id)` index.
- There are **no Postgres RLS policies** (`rg 'row level security|create policy|enable row'` returns nothing). A missed `where` clause is a cross-couple data breach; there is no second line of defence.

## 5. Places the code assumes ONE couple / one person

1. `ctxFor()` takes the first relationship membership with `limit(1)` (`src/lib/context.ts:32-37`). No relationship state (invited/active/paused/ended), no history.
2. `ctx.partners[0]` is treated as "the" partner in calls (`src/lib/calls/server.ts:158,254`), chat (`src/lib/chat/server.ts:50,254`), notifications/layout (`src/app/layout.tsx:52`) and home (`src/app/page.tsx:136`).
3. Accounts exist only through `scripts/seed.ts`; login is a globally unique slug + passcode. No email, phone, signup, reset, recovery or deletion.
4. Seed hardcodes Hassan and Whitney: profiles, skills, projects, interests, radar lanes, relationship name "Our Universe", timezone implied by Kenya-specific questions.
5. `WORLDS.hassan` / `WORLDS.whitney` vocabulary (`src/lib/worlds.ts`), `WORLD_LINE` (`src/app/page.tsx:22-25`), world themes in `globals.css`, and `layout.tsx` metadata all name the couple.
6. Daily questions use `nairobiDay()` (`src/lib/together/questions.ts:70-72`); the question list is hand-written around Kenya, birds, knitting and the couple's life.
7. Topic registry is a fixed union of 8 topics (`TopicKey`), and the 39 sources were chosen for the couple's interests.
8. One deployment-global Gemini key and one TURN relay live in `kv` (`src/lib/settings.ts`), shared by every account, with no per-user quotas.
9. `presence` is keyed by person only; `chat_state` is keyed by person (with a relationship id); `calls` allows one live call per relationship. A person can never have a second/historical couple.
10. `people.slug` is globally unique and used as the public profile URL and login identifier (`/p/[slug]`), so slugs collide across couples.
11. Media paths are per relationship, not per couple; storage access is app-level.
12. Public metadata/manifest hardcode the couple's names and story (`layout.tsx:20`, `manifest.ts`).
13. Global trends tables (`trends`, `trend_sources`) are not couple-scoped; `saved_discoveries` is per person.
14. The session/VAPID/sealing secrets are all derived from `DATABASE_URL` when `SESSION_SECRET` is absent — one deployment secret, no per-couple isolation of secrets.

## 6. Backend, hosting and auth

- Production target: Vercel Hobby (explicitly personal, non-commercial in `DEPLOY.md`), Neon free Postgres, GitHub Actions ingest every 2 hours, Vercel Blob (free 1 GB).
- Local: zero setup; PGlite database in `.data/`, auto-migrated on first use. PGlite permits one process at a time.
- Migrations run during Vercel build (`npm run vercel-build`); a runtime `withSchema()` retries once after applying pending migrations when a table/column is missing.
- Auth: first-party email + password. HS256 JWT (`lovora_session`, 30 days) in an httpOnly, SameSite=Lax, Secure-in-production cookie; bcrypt cost 12; generic login errors with a dummy-hash timing path; DB-backed per-IP and per-account attempt buckets (15-minute windows); one-time SHA-256 recovery codes; `session_version` revokes every earlier token on password change, recovery or "sign out everywhere". No MFA yet; email delivery/verification is a human task (H4).
- Nothing is deployed by this iteration; no production access was used.

## 7. Third-party services and keys

| Service | Use | Secret | Risk at scale |
| --- | --- | --- | --- |
| Neon | Postgres in production | `DATABASE_URL` | Free plan limits; single project; no RLS |
| Vercel | Hosting + Blob | `BLOB_READ_WRITE_TOKEN` / OIDC | Hobby is non-commercial; Blob is one global store with no per-couple quota |
| GitHub Actions | Scheduled ingest | `DATABASE_URL` secret | Private-repo minutes; shared ingestion for all couples |
| Gemini API | Research | `GEMINI_API_KEY` or sealed `kv` secret | One key/quota for every couple; no cost control |
| OpenAlex | Scholarly search | none | Free; rate limits to respect |
| iNaturalist | Sightings/bird data | none | Public API; attribution/licence per item |
| 39 RSS/Atom feeds | Discover content | none | Per-source terms; images hotlinked |
| YouTube IFrame/oEmbed | Watch/listen source | none | Must follow YouTube API Services policies (official player only) |
| Metered/Cloudflare/any TURN | Call relay fallback | env or sealed `kv` | Shared relay; cost/abuse if opened to thousands |
| Web Push (VAPID) | Alerts | derived from deployment secret | Key rotation signs devices out; no native APNs/FCM yet |

## 8. Media and asset licensing

- No music, film clips, stock photos or bundled image library are committed. Gallery media is user-uploaded and private.
- Feed images: publisher feed/preview images are hotlinked with credit, NASA public-domain images, and iNaturalist CC images with per-item credit/licence (`README.md`, `src/lib/trends/enrich.ts`). This is careful for a personal site but not a verified licence registry for a commercial product; a per-source image policy is needed.
- Fonts: Inter, Fraunces, Cormorant Garamond, JetBrains Mono via Google Fonts — all SIL Open Font License; no bundled font files.
- Icons: hand-written React SVG components (`src/components/icons.tsx`); `public/*.svg` are unused Next.js starter assets (not referenced by the app) and should be removed.
- Verses/vows and daily questions appear original to this project (no attributed quotes found).
- YouTube content is embedded, never downloaded; this matches the official-player requirement but must be stated in store review notes.

## 9. Tests, CI and build status (real commands, 2026-11-15)

| Command | Result |
| --- | --- |
| `npm ci` | Pass. 568 packages. Audit: **23 vulnerabilities** (1 critical, 8 high, 13 moderate, 1 low). |
| `npm run typecheck` (fresh checkout) | **FAIL** — missing Next generated globals (`PageProps`, `LayoutProps`, `RouteContext`). |
| `npx next typegen` then `npm run typecheck` | **PASS**. CI already runs `next typegen`; AGENTS.md must say so. |
| `npm run lint` | **PASS** (no output). |
| `npm test` | **PASS** — 4 files, 41 tests. Warning: `vitest.config.mts` uses `__dirname`; Vite's native config loader will require `import.meta.dirname`. |
| `npm run build` | **PASS** — Next 16.3.6 Turbopack. Warning: Next ignored `C:\Users\kkc36\package-lock.json` because it is outside the git repo; set `turbopack.root` to silence. |

Coverage: only trends engine, visibility/clock/verse logic, push key derivation, and research parsing have tests. **No tests cover auth, chat, calls, room sync, gallery uploads, or tenancy.** CI has no build, no e2e, no RLS, no dependency audit, no secret scan and no SAST.

Dependency advisories (high/critical only):

- **critical** `next` 16.3.6 — fix available: `next@16.4.6` (not semver-major).
- **high** `@vercel/blob` → `@vercel/oidc`/`zod` chain; the suggested fix is a semver-major change to `@vercel/blob@2.4.0` — review before applying.
- **high** `sharp`, `source-map-js`, `undici`, `vite`. Most are dev/build transitive but must be triaged.

## 10. Secret scan

- `gitleaks` is not installed on this machine, so a full entropy scan was not possible; this is recorded in HUMAN_TASKS/VERIFICATION.
- `git rev-list --all --objects` lists only `.env.example` among env-like files; no `.env`, `.env.local`, or `PASSCODES*.md` was ever committed.
- `git log -S` searches for `AIza`, `ghp_`, `sk_live`, `BEGIN RSA PRIVATE KEY`, and `DATABASE_URL=postgres` found no commits.
- `.gitignore` covers `.env*` (except `.env.example`), `PASSCODES*.md`, `.data/`, `.next/`, `.vercel`.
- Residual risk: pattern search is weaker than gitleaks; add gitleaks + trufflehog entropy scan to CI (E0-003) and rotate anything found.

## 11. Top risks this audit confirms

1. **No database-enforced tenant isolation.** The single most important pre-launch item (E1-001/E1-002).
2. **Polling that writes on every tick.** Pulse every 3 s (presence + delivery writes), chat every 1.5 s (delivery write), room every 1 s (presence write), calls every 0.6–2.5 s (seen writes). Load scales with open screens, not couples; this is the dominant scaling cost (E3/E4/E6).
3. **No real sign-up, recovery or deletion.** Store blockers and a support nightmare (E1-003…E1-011).
4. **One global Gemini key and TURN relay.** No per-user cost control or abuse isolation (E5/E6/E7).
5. **Free-tier, non-commercial hosting.** Vercel Hobby + Neon free are not a commercial foundation (E13, human).
6. **No moderation/report/block/quotas.** Apple 1.2 + NCII and Google UGC policy require them before launch (E9-early).
7. **Critical Next.js advisory** in the current runtime; patch early (E0-004).
8. **Hardcoded content and time zone.** Onboarding and per-couple settings are required (E1-009).
9. **No observability.** No Sentry, structured logs, metrics or alerting (E0-005).
10. **Thin tests around the code being rewritten.** Build the RLS/chat/call/room test suites as part of each rewrite, not after (E12 interleaved).

## 12. Keep vs replace (summary; detailed scoring in `docs/adr/001-stack.md`)

- Keep and evolve: Next.js web client, Drizzle schema/queries, chat/call/sync domain logic, trends engine, research pipeline, the visual identity.
- Replace: custom slug/passcode auth → managed auth; polling → realtime; Neon-only tenancy → Supabase Postgres + RLS + Storage; Vercel Blob → couple-scoped object storage; free-tier deployment → paid staging/production; global secrets → per-user entitlements.
- Add: monorepo shared packages, Expo iOS/Android app, push via APNs/FCM, moderation/quotas, account export/delete/unlink, i18n/a11y, observability, load tests.
