# ADR-001 — Target stack for the multi-couple product

- Status: Accepted for planning (Phase 0)
- Date: 2026-11-15
- Deciders: autonomous loop (recommendation); human sign-off needed for paid accounts and legal items
- Evidence: `.loop/audit.md`; MASTER_SPEC §3–§5; official sources below.

## Context

The current product is a polished, single-couple Next.js 16 application (~18.7k lines, 33 routes) with custom auth, Drizzle over Neon/PGlite, Vercel Blob, polling-based chat/rooms/calls, Web Push, and a research pipeline. It must become a multi-tenant product for 10,000 couples (20,000 users, ~1,500 concurrent, ~300 media rooms) on web, iOS and Android, operated by 1–3 people, without losing the existing experience.

MASTER_SPEC defaults to Expo universal + Supabase. The audit found the existing web client is substantial and distinctive (custom design system, server components, sync heuristics, chat/call UX). Rewriting it in Expo Router would discard working, tested-in-production UI and delay parity. The audit also confirmed there is no database-enforced tenancy, no realtime transport, no managed auth and no per-couple storage — the parts that should be replaced.

## Decision (summary)

1. **Keep Next.js for web**; add an **Expo (React Native) app** for iOS/Android in a pnpm + Turborepo monorepo.
2. **Migrate the backend to Supabase** (Postgres, Auth, Storage, Realtime) while **keeping Drizzle ORM and SQL migrations**.
3. Enforce tenancy in the database with **RLS + pgTAP tests**, not only in application code.
4. Use **Supabase Auth** (email OTP/magic link, Apple, Google) and **Supabase Storage** (private buckets, TUS resumable uploads, signed URLs).
5. Use **Supabase Realtime private channels** for chat/rooms/calls signalling; retain low-frequency polling as a fallback.
6. Keep **peer-to-peer WebRTC + TURN** for 1:1 calls; keep LiveKit as a later ADR option for screen-share/group.
7. Keep **Vercel Pro** for the web app and **Expo EAS** for mobile builds; separate staging/production Supabase projects.
8. Media: **YouTube official embed, CC catalogue via provider interface, podcasts, private uploads, and a countdown mode**. No Spotify dependency.

## Scoring

Scale: 1 (poor) to 5 (excellent), weighted by MASTER_SPEC §5 criteria. "Now" means the current repo.

| Layer | Option | Security isolation | Time to production | Cost at §2 scale | Code sharing web/iOS/Android | Operability 1–3 people | Total /25 | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web client | **Keep Next.js 16** | 4 | 5 | 4 | 4 (shared TS packages) | 5 | **22** | Keep |
| Web client | Rewrite as Expo Router web | 4 | 2 | 4 | 5 | 3 | 18 | Reject (rewrite cost, weaker web) |
| Web client | Astro/other SPA + API | 3 | 2 | 4 | 3 | 3 | 15 | Reject |
| Mobile | **Expo + Expo Router + EAS** | 4 | 4 | 4 | 5 | 5 | **22** | Adopt |
| Mobile | Bare React Native | 4 | 3 | 4 | 4 | 3 | 18 | Reject (more native ops) |
| Mobile | Flutter | 4 | 2 | 4 | 1 (no TS sharing) | 3 | 14 | Reject |
| Mobile | PWA only | 3 | 5 | 5 | 5 | 5 | 23 | Reject as primary (no reliable ringing/background audio/store presence) |
| DB/platform | **Supabase Postgres + RLS** | 5 | 3 | 4 | 5 | 4 | **21** | Migrate |
| DB/platform | Keep Neon + app-level tenancy | 2 | 5 | 5 | 5 | 5 | 22 by cost but **fails isolation** | Reject for tenancy (could keep as DR) |
| DB/platform | Neon + Auth.js + Ably + S3 | 4 | 2 | 3 | 4 | 2 | 15 | Reject (4 vendors, more ops) |
| ORM | **Keep Drizzle + SQL migrations** | 4 | 4 | 5 | 5 | 5 | **23** | Keep |
| ORM | Supabase generated types + supabase-js only | 4 | 2 | 5 | 4 | 4 | 19 | Reject (rewrite of all queries) |
| Auth | **Supabase Auth** | 5 | 4 | 4 | 4 | 5 | **22** | Adopt |
| Auth | Keep custom slug/passcode, add recovery | 2 | 2 | 5 | 5 | 2 | 16 | Reject (security/support burden) |
| Auth | Clerk/Auth0 | 5 | 3 | 2 (MAU pricing) | 4 | 4 | 18 | Reject at 20k users cost; revisit if Supabase Auth blocks |
| Storage | **Supabase Storage + RLS + TUS** | 5 | 4 | 4 | 4 | 4 | **21** | Adopt |
| Storage | Keep Vercel Blob | 3 | 5 | 3 | 4 | 4 | 19 | Reject (no couple policies/quotas; Vercel lock-in) |
| Realtime | **Supabase Realtime private channels** | 5 | 4 | 3 (Pro no-spend-cap) | 4 | 4 | **20** | Adopt |
| Realtime | Ably/Pusher | 5 | 4 | 2 | 4 | 3 | 18 | Reject (cost/vendor) |
| Realtime | Custom WebSocket service | 4 | 1 | 3 | 3 | 1 | 12 | Reject (ops) |
| Calls | **P2P WebRTC + TURN** | 4 | 4 | 5 | 4 | 3 | **20** | Keep |
| Calls | LiveKit Cloud SFU | 5 | 4 | 2 | 4 | 4 | 19 | Keep as later option for screen-share/group |
| Hosting | **Vercel Pro + Supabase + EAS** | 4 | 5 | 3 | 5 | 5 | **22** | Adopt |
| Hosting | Self-host (Fly/Render + Supabase self-host) | 4 | 2 | 3 | 4 | 2 | 15 | Reject for v1 |
| Monorepo | **pnpm + Turborepo** | — | 4 | 5 | 5 | 5 | **19** | Adopt |

## Verified external constraints

| Claim | Status | Source / date |
| --- | --- | --- |
| Supabase Realtime limits: 200/500/10,000 connections on Free/Pro/Pro-without-spend-cap; 100/500/2,500 msgs/s; 100/500/2,500 joins/s | **VERIFIED** | https://supabase.com/docs/guides/realtime/rate-limits — fetched 2026-11-15 |
| Spotify Development Mode: owner needs Premium, max 5 authenticated users; Extended Quota only for organisations with a launched service and ≥250k MAU (since 2025-05-15) | **VERIFIED** | https://developer.spotify.com/documentation/web-api/concepts/quota-modes — fetched 2026-11-15 |
| YouTube API Services: API Clients must use the official minimum functionality; must not download, cache/backup, or make audiovisual content available for offline playback; must not facilitate infringement; must link YouTube ToS and use a compliant privacy policy | **VERIFIED** | https://developers.google.com/youtube/terms/developer-policies — fetched 2026-11-15 |
| YouTube "no background play" and exact player-UI requirements | **PARTIALLY VERIFIED** — the policies require compliance with the Requirements for Minimum Functionality; read https://developers.google.com/youtube/terms/required-minimum-functionality before building the player (E4) | 2026-11-15 |
| Google Play: from 2026-08-31 new apps/updates must target Android 16 (API 36); extension available to 2026-11-01 | **VERIFIED** | https://support.google.com/googleplay/android-developer/answer/11926878 — fetched 2026-11-15 |
| Google Play: 16 KB page-size support for API 35+; personal accounts need 12 testers for 14 days | **UNVERIFIED** — check Play Console help and Expo SDK docs before choosing SDK (E0/E13) | — |
| Apple 1.2 UGC: filtering, reporting with timely response, blocking, published contact info; extends to NCII (2026-10-16 update per spec) | **VERIFIED (1.2 text)**; the 2026-10-16 NCII extension is **UNVERIFIED** | https://developer.apple.com/app-store/review/guidelines/ — fetched 2026-11-15 |
| Apple 5.1.1(v): account creation requires in-app account deletion; 4.8 login services applies to third-party login | **VERIFIED** | same URL — fetched 2026-11-15 |
| Kenya Data Protection Act / ODPC registration, cross-border transfer clauses, breach deadline | **UNVERIFIED** — legal review is a human task | — |
| Jamendo free tier is non-commercial and per-track CC licences require attribution | **UNVERIFIED** — verify API terms and licence fields before E5 | — |
| LiveKit Cloud pricing (free 5,000 participant-minutes; Ship $50/150,000) | **UNVERIFIED** — not load-bearing for P2P v1 | — |
| Expo SDK / React Native version supports API 36 and 16 KB pages | **UNVERIFIED** — pin and verify in E13 | — |

## Consequences

**Positive**

- Existing web UI, domain logic and the "universe" identity survive.
- One managed platform provides auth, storage, realtime and Postgres with RLS, reducing the operational surface for 1–3 people.
- Drizzle keeps type-safe schema/queries and the existing migration style; RLS is added as SQL migrations and tested independently.
- Expo gives one TypeScript mobile codebase and shares `domain`, `api-client`, `sync-protocol`, `ui-tokens`, `i18n`.
- Supabase Storage policies use the same `is_couple_member()` check as Postgres, which is the isolation invariant the product needs.

**Negative / risks**

- Supabase Realtime at 1,500 concurrent users requires **Pro with the spend cap lifted** (10,000 connections) or Team; budget alerts and load tests are mandatory. Default Pro (500) is insufficient. Cost is an assumption until measured.
- Supabase Auth migration means existing users cannot keep the slug/passcode flow; they will go through a one-time account claim/reset. Password hashes are bcrypt, but there is no email on `people`, so a claim flow is required.
- Two app codebases (Next.js web, Expo mobile) still mean two UI implementations; only logic/types are shared. This is the price of keeping the existing web experience.
- Vercel Pro is required (Hobby is non-commercial). EAS has its own build/submit costs.
- RLS has a learning curve; every new table must ship with policies and tests or the gate fails.

## Migration path (high level)

1. Create Supabase staging/production projects (human task). Do not touch production.
2. Add `couples`, `couple_members`, `invitations`, `profiles`, `reports`, `audit_log`, `consents`, `entitlements`; map `relationships` → `couples`; add `couple_id` to every couple-owned table and backfill from the existing relationship.
3. Enable RLS + `is_couple_member(couple_id)` + default-deny; add pgTAP tests for every table, bucket and realtime channel.
4. Replace custom sessions with Supabase Auth; add a one-time claim flow for the existing two accounts; delete the passcode login only after the claim is verified.
5. Move media from Vercel Blob to Supabase Storage under `<couple_id>/…`; keep signed URL expiry short; write a copy/verify script; do not delete the old store until verified.
6. Replace polling with Realtime channels while keeping a degraded polling fallback for low bandwidth/old clients.
7. Introduce the monorepo and packages before the Expo app; move the Next.js app to `apps/web` in one mechanical change with CI green.
8. Build the Expo app against the same API client; add APNs/FCM through Expo push.

## Rejected alternatives (recorded)

- **Stay on Neon with app-level checks**: fastest, but fails the mandatory isolation proof and makes every query a potential breach.
- **Expo universal for web now**: cleanest code sharing but discards a working, distinctive web UI and delays parity; revisit after nativeship if web maintenance cost dominates.
- **Supabase-only client (no Drizzle)**: would rewrite every query and lose domain types; rejected for this codebase.
- **Spotify integration**: explicitly ruled out by G1 (verified); listen-together uses provider interface + CC/podcasts/uploads/YouTube official player.
- **DRM screen-share promises**: G4 remains unverified; the product will offer countdown sync for external services and never claim screen-share works.

## Open decisions requiring humans

- Supabase plan/budget (Pro with spend cap lifted vs Team) and paid Vercel.
- Google Play organisation account vs personal (12-tester rule) and D-U-N-S.
- Jamendo commercial licence vs strict non-commercial filter.
- Kenya ODPC registration and cross-border transfer documentation.
- Product name/trademark; launch regions; pricing.

## References

- Supabase Realtime limits — https://supabase.com/docs/guides/realtime/rate-limits (fetched 2026-11-15).
- Supabase Realtime authorization (private channels / RLS on `realtime.messages`) — read before E4: https://supabase.com/docs/guides/realtime/authorization (not yet fetched; mark UNVERIFIED until E4).
- Spotify quota modes — https://developer.spotify.com/documentation/web-api/concepts/quota-modes (fetched 2026-11-15).
- YouTube API Services policies — https://developers.google.com/youtube/terms/developer-policies (fetched 2026-11-15); minimum functionality — https://developers.google.com/youtube/terms/required-minimum-functionality (to verify in E4).
- Google Play target API levels — https://support.google.com/googleplay/android-developer/answer/11926878 (fetched 2026-11-15).
- Apple App Review Guidelines 1.2, 4.8, 5.1.1(v) — https://developer.apple.com/app-store/review/guidelines/ (fetched 2026-11-15).
- MASTER_SPEC §3–§5 and `.loop/audit.md`.
