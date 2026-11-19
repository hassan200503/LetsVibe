# Let'sVibe

A private shared world for two: messages, encrypted calls, synchronised listening and watching, memories, and live discoveries from the real world. Web today, one shared TypeScript codebase, and a tested sync protocol underneath the room.

Requires Node.js 24+ and pnpm 12.21.0 (`corepack enable pnpm` once, or use any Node version manager). No database setup is needed.

```
                  LET'SVIBE
                      │
        ┌─────────────┼─────────────┐
     YOU           OUR STORY      PARTNER
   software        memories      nature
   technology      plans         writing
   philosophy      milestones    making
   nature          discoveries   environment
        └─────────────┼─────────────┘
               SHARED DISCOVERY
            LIVE REAL-WORLD TRENDS
```

## What's inside

| Area | Where |
| --- | --- |
| Home: the night stage with a journey verse that changes on every visit, a live journey clock, the road ahead, a moment from your journey | `/` |
| Messages: typing indicator, sent / delivered / read ticks, swipe or hold to reply, reactions, edit, delete for me or for everyone | `/together/chat` |
| Voice and video calls, from Messages, the partner menu in the header, or the home page | anywhere |
| Together room: listen and watch in sync, with the chat beside you; it keeps playing (as a mini-player) through Messages, calls and the rest of the site | `/together` |
| Our Story: memories, milestones, adventures, plans, saved discoveries | `/story` |
| Each person's world: profile, dashboard, journal, radar, skills, Knowledge Vault | `/world/[slug]` |
| Per-person projects and thinking journal | `/world/[slug]/projects`, `/world/[slug]/thinking` |
| For You (interleaves every followed topic; favourite topics get double space) | `/discover` |
| Topic feeds with category filters: software, technology, philosophy, nature, biotech, birds, knitting, environment | `/discover/[topic]` |
| Something We Both Might Like: items touching both a technology and a life-science thread | `/discover/together` |
| Things We Are Learning (shared) | `/learning` |
| Research: real studies read and cited, step-by-step lessons with a quiz, or the simple version; share threads with each other | `/research` |
| Weekly digest (any past week) | `/digest` |
| Global search | `/search` |
| Personalisation: interests, favourite topics, muted/starred sources, hidden categories and keywords | `/settings` |
| Opt-in public profile (public skills and projects only, at an opaque link) | `/p/[handle]` |
| Source health | `/discover/sources` |

### Start fresh or use demo data

To begin with your own world, run `pnpm reset`, start `pnpm dev`, and open `/welcome`. The first person creates the world, picks interests and gets a private 24-hour invitation link for their partner. No demo accounts are created.

`pnpm run setup` instead creates a generic demo couple, **Alex** and **Sam**, with a few interests, skills and projects. Change names and profiles in Settings; `pnpm reset` clears the local world and seed passcodes.

### Privacy

Everything personal has a visibility: 🔒 **private** (owner only), 💞 **shared** (the two of you), or 🌍 **public** (only on an enabled public profile). Vault and thinking-journal entries default to private. The rule is implemented once, in `visibleTo()` (`apps/web/src/lib/context.ts`), and every read goes through it.

## Messages and calls

- **Messages** live in their own table (`messages`), so replies, reactions, edits and "delete for everyone" keep their place in the conversation. Clients poll `/api/chat?since=…` every 1.5 s while you're both online (4 s otherwise, paused in the background). Each send carries an id made on the device, so a retry is stored once.
- **Typing and receipts** come from `chat_state`: `typing_until` for the dots, `last_delivered_id` (set when a partner's device fetches) and `last_read_id` (set while the chat is on screen) for ✓, ✓✓ and blue ✓✓.
- **Calls** are peer-to-peer WebRTC: audio and video go directly between the two browsers, encrypted end to end. The server only relays the handshake (`calls`, `call_signals`) through `/api/call`. Every call negotiates both audio and video, so turning the camera on mid-call is instant; a data channel carries mute, camera and hang-up; the caller restarts ICE when a network changes. Calls ring anywhere on the site within a few seconds (the pulse checks in every 3 s while your partner is online), and each call leaves a line in the chat.
- **Alerts like a phone's messenger** use Web Push (`public/sw.js`): calls ring (and keep ringing every few seconds until answered, declined or missed) and messages pop up, even when the site is closed or nobody is signed in on that device. After signing in on a new device, a "Stay within reach" sheet asks to turn them on (on iPhone it shows the Add to Home Screen steps first); Settings → Calls & alerts and a banner in Messages do the same. Subscriptions refresh on every visit and survive signing out. "Decline" on a call notification carries a signed token, so it works on a signed-out device; "Answer" opens the call (through sign-in if needed). The app icon shows the unread count. VAPID keys are derived from the session secret, so there is nothing to configure.

## Research

- **Ask anything** at `/research` in one of three modes: *Research studies* (finds papers in [OpenAlex](https://openalex.org), a free index of 250M+ scholarly works, and has Gemini synthesise them with numbered citations that open each study), *Learn it* (a step-by-step lesson ending in a self-check) and *Explain simply*. Answers stream in as they're written, with three follow-up questions to go further.
- **Threads** keep the conversation, so follow-ups have context. Share a thread and it appears in your partner's Research too; they can read it and ask follow-ups. **Quiz me** writes five multiple-choice questions on what a thread covered. **Save to learning** keeps an answer in Things We Are Learning.
- **Gemini** (`apps/web/src/lib/research/gemini.ts`) tries each model in `GEMINI_MODELS` until one answers, first with Google Search grounding, then without; a model that says "busy" waits at the back of the queue for a minute. When grounding is used, Google's search suggestions are shown with the answer, as Google requires.
- **Keys** come from `GEMINI_API_KEY`, or from Settings → AI research, where the key is checked with Google and stored sealed (AES-256-GCM) in the `kv` table (`apps/web/src/lib/settings.ts`). The call relay in Settings → Call relay is stored the same way. Neither ever reaches the browser.

## Listening together

- **One player for the whole site.** The room's player lives in the root layout (`apps/web/src/components/together/room-provider.tsx`), so opening Messages, taking a call or visiting any page never stops the music: outside the room it becomes a mini-player (play/pause for both, back to the room, stop on this device). During a call the music drops to 20% volume.
- **Staying in step.** The server keeps `{playing, position, updatedAt}`; play/pause/seek carry the moment they happened, so request travel time doesn't put anyone behind. Each device estimates the server clock from its fastest recent round trips, never lets an older reply undo a newer state, and closes gaps by playing up to 5–10% faster or slower. It jumps only for large gaps, never while buffering, only into audio already downloaded (unless far behind), and backs off on slow connections. "Ended" names the state version it judged, so a stale report can't stop a track that was just restarted.
- **Measured, not asserted.** Those rules live in `packages/sync-protocol` — pure TypeScript with no React, clock or random source — together with a deterministic simulator that runs two skewed clients over latency, jitter, packet loss and buffering stalls in virtual time. Seed 7 of the default 95-second scenario measures **p95 drift of 295 ms on wifi, 280 ms on mobile and 326 ms on poor networks**, and 286 ms with 33% packet loss, against a 500 ms target. The same rules drive the room provider, so what CI measures is what ships.

## The Live Trends Engine

```
Source registry (sources.ts) → adapter (RSS/Atom, iNaturalist) → normalise
→ quality filter → deduplicate (normalised URL) → categorise + tag (topics.ts)
→ Postgres → keyset-paginated API (/api/trends) → React Query infinite feed
```

- **Real data only.** 39 sources were checked on 2026-09-27 to be current. An item without a date is dropped rather than shown with a guessed freshness. Items older than a year are skipped, and future timestamps are clamped to now.
- **Honest freshness.** A feed shows **Live** only if its sources publish through the day, were checked in the last 2 hours, and delivered something in the last 24 hours. Otherwise it shows "Sources update daily" and when they were last checked. Cards show relative and absolute publish dates, with the retrieval date on hover and on the detail page.
- **Never on page load.** Pages read only from the database. The scheduled job fetches, and if it stalls, the next visitor's request schedules a short background refresh (`after()`) for sources that are due. Visitors never wait on external APIs.
- **Failure handling.** Sources are claimed atomically, so overlapping runs never double-fetch. Failures back off exponentially (capped at a day) and honour `Retry-After`. The UI shows *"Some discoveries are temporarily unavailable. Your saved content is still here."* with cached content still in place.
- **Attribution and licensing.** We store a title, a ≤280-character excerpt, metadata and a link, never the full article. Images appear only where reuse is clearly allowed: NASA (public domain) and iNaturalist photos under CC licences, each with its credit and licence shown. Every other card uses the topic's own artwork.
- **Quality.** Sources are tiered (official organisations → universities → research institutions → journals → …), and a filter drops coupon, deal and gift-guide posts.
- **Adding a source:** append one line to `apps/web/src/lib/trends/sources.ts`. **Changing categories:** edit `apps/web/src/lib/trends/topics.ts`, then run `pnpm retag` to re-apply the rules to stored items.

## Run it locally

```bash
pnpm run setup             # install, generate types, seed Alex and Sam
# or: pnpm reset          # clear local data and begin at /welcome
pnpm ingest --force    # optional: fetch the first live discoveries
pnpm dev
```

No database setup is needed: without `DATABASE_URL`, an embedded Postgres (PGlite) lives in `apps/web/.data/`. It allows one process at a time, so stop `pnpm dev` before running `seed`, `ingest` or `retag`. The generated demo passcodes are in `apps/web/.env.local` (git-ignored); `pnpm passcodes` writes a handover file.

```bash
pnpm test          # unit + integration over a real migrated PGlite schema, including the
                   # 21-table cross-couple tenancy matrix and the sync simulator
pnpm typecheck
pnpm lint
pnpm build
pnpm a11y          # axe-core WCAG 2.2 AA, light and dark
```

Turborepo runs each gate across `apps/web` and `packages/*`. Integration tests boot an embedded Postgres and apply the same Drizzle migrations production gets, so tenant isolation is tested against the real schema rather than mocks.

## How it's built

- **Monorepo:** pnpm workspaces + Turborepo. `apps/web` is Next.js (App Router, React Server Components, server actions) on React 19; `packages/domain`, `packages/sync-protocol` and `packages/ui-tokens` are shared, typed and independently tested.
- **Data:** Drizzle ORM over Postgres (embedded PGlite locally and in tests, node-postgres/Neon in production). Every couple-owned table carries `couple_id`, and the context is resolved from the verified session — never from a URL or request parameter.
- **Privacy by construction:** one `visibleTo()` rule decides private / shared / public, a 21-table generated matrix proves another couple's rows can't be read or written, and the public profile is served by a single reader with a column allowlist at an opaque handle.
- **Realtime:** polling with server-assigned versions for chat and room state, WebRTC for calls, Web Push for rings and messages. No shared socket required, so it works on any host that runs Node.
- **AI:** Gemini research with citations and grounded search, keys sealed at rest; next, an in-app agent for guidance and automatic code review.
- **Status:** the web app is production-grade and shippable as a PWA. A native Expo shell is planned and gated on store accounts and device testing, not on a rewrite — the domain and sync logic are already framework-free.

## Deploy for free (no card)

See [`DEPLOY.md`](DEPLOY.md).
