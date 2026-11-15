# MASTER_SPEC — Let'sVibe (formerly Our Universe), multi-couple edition

Read fully in Phase 0. After that, open only the section a story points to.
Research date: 2026-11-15. Items marked **VERIFY** must be re-checked from the official source before you rely on them; record URL + date in the relevant ADR/doc. Items marked **ASSUMPTION** are targets chosen without data; tune them with measurements.

---

## 1. Product vision

A private, beautiful, reliable home for each couple. One couple = one private "Universe" that only the two partners can enter. Inside: talk and call, keep memories, plan, explore ideas and places together, **watch together** and **listen together** in sync, and everything the current repo already does (inventory it in Phase 0 — nothing may be silently dropped).

Principles, in priority order:
1. **Safety and privacy first.** Couples share intimate content. Isolation between couples, safe unlinking, and no covert monitoring are core features, not polish.
2. **Legal by construction.** No unlicensed media, no policy-violating integrations (see §3).
3. **Works on bad networks and mid-range Android.** Low-bandwidth mode, resumable uploads, offline queue, small bundles.
4. **Delight.** The existing "universe" identity, motion and tone must be preserved and extended, not replaced by a generic template.
5. **Operable.** Observability, backups, runbooks, and cost control from day one.

## 2. Scale targets (ASSUMPTION — tune with load tests)

Design for 10,000 couples registered (20,000 users), ~1,500 concurrent users at peak, ~300 simultaneous watch/listen rooms, chat latency p95 < 1 s, media-room sync drift p95 < 500 ms, crash-free sessions ≥ 99.5%, cold start < 2.5 s on a mid-range Android device. Architecture must scale 10× by configuration, not rewrite.

## 3. Ground truth from research (2026-11-15) — these constrain the design

**G1. Do not build on Spotify.** Since Feb–Mar 2026, Spotify Development Mode requires the developer account to hold Premium and caps an app at 5 authorized users and one client ID per developer; Extended Quota (needed for the public) is only for registered organisations with a launched service and ≥ 250,000 MAU (policy since 2025). A public couples app cannot qualify at launch. → "Listen together" must not depend on the Spotify Web API/SDK. VERIFY periodically; if Spotify changes the policy, add it as an optional source behind the source-provider interface.

**G2. YouTube is allowed only through its official embedded player.** YouTube API Services policies: the API client must reflect the standard YouTube experience; no background play of the player; no separating/extracting audio or video; don't block or alter ads, branding or standard player controls; custom overlays for playback controls are acceptable if they don't conflict with player UI. → YouTube sources: visible in-app player only, synced via IFrame/player APIs, no background audio, no downloads, link to YouTube ToS in store review notes. Tell users plainly that YouTube audio stops when the app is backgrounded.

**G3. Licensed audio catalogue = Creative Commons / licensed sources.** Jamendo offers a CC catalogue with streaming URLs; its free API tier is for non-commercial apps (reported 35,000 requests/month); each track has its own CC licence (some non-commercial, some share-alike, all need attribution); commercial use needs separate licensing. → If the app ever has paid features, either obtain a commercial licence or filter strictly to tracks whose licence permits commercial use and show attribution. Always read the per-track licence field. Other legal sources: podcasts via public RSS, public-domain video/audio (e.g. Internet Archive), user-owned personal uploads (private to the couple, never public).

**G4. Streaming-service DRM content (Netflix etc.).** Existing watch-party tools sync each partner's *own* subscription (press play together); that is a browser-extension model that mobile store apps can't replicate. Screen-sharing DRM video typically fails or shows black on many platforms — UNVERIFIED here, test it and document the result; never promise it. → Offer a **"Sync by countdown"** mode for any external service (shared 3-2-1 + shared pause/resume timer + chat/call), plus the legal in-app sources from G2/G3.

**G5. Supabase Realtime limits (official docs):** concurrent connections Free 200 / Pro 500 / Pro-without-spend-cap 10,000 / Team 10,000; messages per second 100 / 500 / 2,500 / 2,500; channel joins per second 100 / 500 / 2,500 / 2,500. Reported plan prices (third-party, VERIFY): Pro $25/month per organisation, 5M realtime messages included. → ~250 couples online at once already exceeds Pro's default 500 connections. Plan for Pro with the spend cap lifted (with budget alerts) or higher, and keep sync traffic low (heartbeats ≤ 1 per 5 s per client; batch; no per-second ticks).

**G6. Calls.** LiveKit Cloud (reported, VERIFY): Build free = 5,000 WebRTC participant-minutes/month; Ship $50/month with 150,000. A 2-person 1-hour call = 120 participant-minutes, so the free tier is ~41 two-person-hours per month in total. → For 1:1 couple calls default to peer-to-peer WebRTC with STUN and a TURN fallback (relay cost only when P2P fails); keep an SFU (LiveKit self-hosted/cloud) as an ADR option for screen-share or future group features. Produce a cost model (cost per couple-hour) in the ADR.

**G7. Google Play.** From 2026-08-31 new apps and updates must target Android 16 (API 36); anything targeting API 35+ must support 16 KB memory page sizes (check the Expo SDK / React Native version and every native dependency). Personal developer accounts created after 2023-11-13 must run a closed test with ≥ 12 testers opted in for 14 continuous days before production access; organisation accounts are exempt (they need a D-U-N-S number, which can take weeks). VERIFY.

**G8. Apple App Store.** Guideline 1.2 (user-generated content, which includes anything partners share): filter objectionable material, report mechanism with timely response, block abusive users, published contact info. The 2026-10-16 update extends 1.2 to non-consensual intimate imagery including AI-generated. 5.1.1(v): apps with account creation must offer in-app account deletion (deleting all associated data; revoke Sign in with Apple tokens via the REST API). Guideline 4.8 (login services) applies if you offer third-party social login — VERIFY the current text.

**G9. Kenya Data Protection Act 2019 (founder is in Kenya; also a sensible baseline everywhere).** Applies to processing of Kenyan residents' data regardless of where the controller is based. Controllers/processors must register with the ODPC unless exempt (sources disagree on certificate validity: 1 year vs 24 months — VERIFY). ODPC published Guidance Notes on Cross-border Data Transfers in Sept 2026 (standard clauses for controller-to-controller and controller-to-processor, documentation required for safeguard-based transfers). General data localisation is not required; it is limited to specific purposes. → Hosting on Supabase/other non-Kenyan regions needs documented transfer safeguards and processor agreements. From recollection (UNVERIFIED): breach notification to the ODPC within 72 hours; relationship-related data such as marital status and sexual orientation may count as sensitive personal data — get legal review and treat all couple data as sensitive by default.

**G10. Competitor landscape (2026 roundups).** Paired (daily questions, quizzes), Between (private chat, shared memories, calendar), TimeTree/Cupla (shared calendars), Raft, Lasting, Honeydue; Teleparty/Rave/Kast for watching together. One source claims Between shut down in 2023 while others list it as active — UNVERIFIED, irrelevant to the decisions. Differentiator to build: private space + synced media rooms + calls + the existing "universe" identity in one place.

## 4. Feature scope (modules)

Every module is multi-tenant (couple-scoped), accessible, localisable, and works on web, iOS and Android unless noted.

**M1 Identity & pairing.** Email OTP/magic link, Apple and Google sign-in, optional password (breached-password check), optional MFA, device/session list, 18+ gate. Pairing: one partner creates the couple and invites the other with a single-use, expiring (default 24 h), high-entropy code/link; both must consent; third parties cannot join; a person belongs to at most one active couple. Leave/unlink with a safe flow (see §7).

**M2 Private space.** Chat (text, photos, voice notes, reactions, read state, offline queue), shared memories timeline and albums, anniversaries and countdowns, shared calendar with both partners' time zones, shared lists/bucket list, notes and time-capsule letters, daily questions and check-ins, games/quizzes, "thinking of you" nudges, long-distance mode (both local times, distance-to-next-visit countdown). App lock (biometrics/PIN), discreet app icon/notification text option.

**M3 Watch together.** Synced rooms with: YouTube embed (G2), public-domain/CC video library, private user uploads (size/duration limits), Sync-by-countdown for external services (G4), screen-share only if proven to work legally and technically (document). Chat/reactions overlay, optional picture-in-picture call, either partner can control, late-join catch-up, reconnect handling.

**M4 Listen together.** Synced listening with: licensed/CC catalogue (G3), podcasts (RSS), private uploads, YouTube audio only via the visible player (G2). Shared playlists and queue, "now playing" status, lock-screen controls, audio-focus handling, background playback for sources that allow it. A source-provider interface so providers can be added/removed without touching room logic.

**M5 Explore.** Preserve whatever "explore" means in the existing repo (Phase 0 decides). Extend with: curated date ideas and activity library (offline-capable), shared bucket list with progress, optional places/map ideas (location off by default), shared gallery of what you did together.

**M6 Calls.** 1:1 voice/video (P2P + TURN fallback, G6), mute/camera controls, network-quality indicator, call-during-media.

**M7 Notifications, widgets, offline.** Push (APNs/FCM/Web Push), quiet hours per partner, home-screen widgets (days together, countdown, partner's local time) where the platform allows, offline reading and queued sends, background sync respecting battery.

**M8 Safety, privacy & trust.** Report/block, content filtering and moderation queue, takedown (incl. copyright) process, data export, account deletion, consent management, abuse-resilient unlinking, safety resources screen, published contact.

**M9 Monetisation (flag-gated, off by default).** Entitlements abstraction + paywall UI behind feature flags. Free core. Platform billing for digital subscriptions on iOS/Android (VERIFY store rules), web payments via a payment provider; RevenueCat or equivalent as an ADR option. No pricing decisions without a human answer in HUMAN_TASKS.md.

**M10 Admin/ops.** Minimal admin console: moderation queue, report handling, user lookup with audit log; staff cannot read couple content except through an audited break-glass flow tied to a report.

## 5. Architecture defaults and decision rules

Prefer these unless the Phase 0 audit gives a concrete, recorded reason to deviate (ADR required, scored on: security isolation, time to production, cost at §2 scale, code sharing across web/iOS/Android, operability by a 1–3 person team).

- **Monorepo:** pnpm workspaces + Turborepo; TypeScript `strict`; shared packages (`domain`, `api-client`, `ui`, `i18n`, `sync-protocol`, `config`).
- **App:** Expo (React Native) + Expo Router as one universal codebase for iOS, Android and web; EAS Build/Submit/Update. Separate static marketing + legal site (Astro or Next). If the existing web code is substantial and worth keeping, ADR may choose Next.js for web sharing `packages/*` with the RN app. Verify the chosen Expo/RN version meets G7 (API 36, 16 KB pages).
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions). Migrations in-repo, typed client generated from schema, seed data, local stack via the Supabase CLI. If the existing backend is something else, ADR decides migrate vs keep; migrating is the default unless it can match RLS-grade tenant isolation.
- **Tenancy:** every row that belongs to a couple has `couple_id`; helper `is_couple_member(couple_id)`; RLS enabled and default-deny on every table; storage object paths prefixed `couple_id/`; storage and Realtime channel authorisation use the same membership check (private channels + policies on `realtime.messages` — VERIFY current Supabase docs). Service-role key only in server-side functions, never in clients.
- **Sync protocol (media rooms), in `packages/sync-protocol`:** events `{type: play|pause|seek|rate|source|queue, positionMs, serverTimeMs, seq, authorId}`; clients estimate server-clock offset by periodic ping; expected position = `positionMs + (nowServer − serverTimeMs) × rate`; drift correction defaults (ASSUMPTION, tune): ignore < 150 ms, soft-correct via playback-rate nudge 150–1000 ms, hard seek > 1000 ms; last-writer-wins by `seq` with server-assigned ordering; heartbeats ≤ 1 per 5 s per client; idempotent handlers; full state snapshot on join/reconnect. Ship a deterministic simulator (latency, jitter, loss, reorder) used in CI to assert drift targets.
- **Uploads:** resumable uploads (Supabase Storage supports TUS — VERIFY), client-side image compression, EXIF/GPS stripping, size/duration quotas per couple, content-type validation, signed URLs with short expiry. Video: v1 limits + client compression; HLS transcoding is an ADR (cost) not a v1 requirement.
- **Calls:** P2P WebRTC with STUN + TURN fallback provider chosen by ADR with cost model (G6).
- **Push/analytics/errors:** Expo push (APNs/FCM) + Web Push; Sentry (PII-scrubbed); product analytics only with consent, no message/media content, no PII in events (PostHog or similar, EU/self-host option noted).
- **CI/CD:** GitHub Actions: install, typecheck, lint, unit, DB migrations on fresh DB + pgTAP RLS tests, web e2e (Playwright), mobile e2e (Maestro or Detox where the runner supports it), secret scan, dependency audit, SAST (CodeQL/Semgrep). Preview environments for web; EAS preview builds for mobile. Staging and production are separate Supabase projects. Production deploys are manual human steps.
- **i18n/a11y:** all strings externalised from day one, English first; WCAG 2.2 AA targets, screen-reader labels, dynamic type, reduced-motion support (the "universe" animations must respect it), RTL-safe layout.
- **Performance budgets (ASSUMPTION):** initial web JS ≤ 250 KB gz for the first route, list virtualisation everywhere, image lazy-load + responsive sizes, low-bandwidth mode (no autoplay video, smaller images, deferred sync), Lighthouse performance ≥ 90 on the marketing site.

## 6. Data model principles

Couples, members, invitations, profiles, messages, attachments, memories, events, lists, notes, check-ins, rooms, room_events, playlists, reports, audit_log, entitlements, consents. Soft-delete with a retention job; hard-delete after the retention window; deletion cascades to storage objects and third-party processors. Every table: `created_at`, `updated_at`, ownership/`couple_id`, RLS policies with tests. Content that is currently hardcoded in the repo (names, dates, photos, texts, playlists) becomes per-couple data created in an onboarding wizard; the original content may remain only as a demo couple in seed data if its licensing is clean.

## 7. Security, privacy and safety requirements

1. **Tenant isolation proof.** pgTAP/integration tests assert that user A cannot read, write or subscribe to any row, storage object or realtime channel of couple B, across every table/bucket/channel. A new table without RLS + tests fails the gate.
2. **Auth hardening.** Rate limits and lockouts on OTP/login/pairing/invite endpoints; secure session storage (Keychain/Keystore); invite codes single-use and expiring; account-enumeration-safe responses; re-auth for sensitive actions (delete account, export, unlink).
3. **Safe unlinking / coercive-control resistance.** Either partner can leave at any time without the other's consent. Default on unlink: access to the shared space ends immediately for the leaver; both can export their own contributions for a 30-day grace window (ASSUMPTION; ADR), then data is deleted unless both opt to keep. No covert monitoring: no hidden tracking, no silent location sharing; location sharing (if built) is opt-in per person, always visibly indicated, instantly revocable by the person being shared. Provide discreet-notification and app-lock options. App stores restrict covert partner-tracking apps (UNVERIFIED) — design to avoid it regardless.
4. **Media safety.** Report/block/mute; objectionable-content filtering and the NCII requirement of G8 (decide an ADR on server-side scanning vs privacy trade-offs; document legal reporting obligations for child-safety material and get legal review); copyright takedown flow; per-couple upload quotas.
5. **Secrets.** No secrets in git or history; `.env.example` only; rotation list for anything found; least-privilege keys; separate staging/prod; CSP and security headers on web; no wildcard CORS.
6. **Supply chain.** Pin dependencies, lockfiles committed, audit in CI, licence check (commercial-compatible), no abandoned packages for security-critical paths.
7. **Privacy by design.** Data map in `docs/PRIVACY.md` (what, why, where, who, how long); consent for analytics and notifications; export (machine-readable JSON + media zip) and in-app account deletion (also revokes Sign in with Apple tokens); retention schedule; logs scrubbed of content and PII; processor list with transfer safeguards (G9); DPIA before launch; breach-response runbook with the statutory deadline VERIFIED from the Act; 18+ only, no knowingly processing minors' data.
8. **Encryption.** TLS everywhere, encryption at rest (provider), signed short-lived media URLs. End-to-end-encrypted "private vault" is an ADR for post-v1: record trade-offs (search, backup, multi-device, moderation) and a recommendation; do not claim E2EE anywhere in the product until implemented and reviewed.

## 8. Store and legal compliance checklist (agent drafts; humans submit and sign)

Privacy policy, Terms, Community Guidelines, copyright/DMCA policy, abuse contact, support page, in-app links to all; Apple privacy "nutrition label" answers and Google Data Safety answers generated from the data map; content-rating questionnaire answers; account-deletion URL for Play; store listing copy and screenshot scripts; review notes explaining sources (YouTube ToS link, CC licences), demo account, and moderation tooling; export-control/encryption declarations noted; Kenya ODPC registration pack and DPIA drafted in `docs/COMPLIANCE.md`.

## 9. Quality gates

Per story (see PROMPT.md §4) plus release-level gates in §12. Test pyramid: unit (domain, sync protocol), integration (DB/RLS, edge functions), e2e (critical journeys: sign up → pair → chat → memory → watch room → listen room → call → export → delete → unlink), load (k6 websocket scenario: 300 rooms × 2 clients + chat, assert under Realtime limits of the chosen plan and sync drift targets), accessibility (axe on web, manual checklist on mobile), security (RLS suite, OWASP MASVS-L1-style checklist, dependency/SAST scans), resilience (kill network mid-upload, reconnect mid-room, clock skew). Report measured numbers only; never estimate them.

## 10. Backlog seed (turn into stories in prd.json; each story ≤ one iteration)

- **E0 Foundations:** monorepo, TS strict, lint/format/hooks, env management, CI skeleton, design tokens extracted from the existing look, i18n + a11y scaffolding, error handling, logging/Sentry, feature flags, local backend scripts, AGENTS.md accuracy.
- **E1 Identity, tenancy, security core:** schema + RLS + tests, auth methods, profile, pairing/invite, leave/unlink, 18+ gate, rate limiting, session/device management, audit log, account export/delete skeleton. *Nothing in later epics ships before E1's isolation tests pass.*
- **E2 Parity migration:** port every feature in `docs/PARITY.md` onto the tenant model; onboarding wizard replaces hardcoded content; remove/replace unlicensed assets.
- **E3 Private space (M2).**
- **E4 Watch together (M3):** sync-protocol package + simulator first, then YouTube provider, library, uploads, countdown mode, UI, reconnect/late-join, load test.
- **E5 Listen together (M4):** provider interface, CC catalogue provider with licence filtering/attribution, podcast provider, uploads, queue/playlists, background playback, lock-screen controls.
- **E6 Calls (M6)** and **E7 Explore (M5).**
- **E8 Notifications, widgets, offline (M7).**
- **E9 Safety/privacy/compliance (M8, §7–8)** — start moderation/report/block and export/delete early (they are store blockers), finish before release.
- **E10 Admin console (M10).**
- **E11 Monetisation scaffolding (M9), flag-gated.**
- **E12 Quality:** e2e suites, load tests, a11y audit, security review, performance tuning, resilience tests, `docs/VERIFICATION.md` kept current.
- **E13 Release readiness:** staging environment, store assets, review notes, beta plan, runbooks (incident, backup/restore drill, key rotation, scaling), cost dashboard, launch checklist (§12).

Ordering rule: E0 → E1 → E2 → (E9-early items) → E3 → E4 → E5 → E6/E7/E8 → E9-rest → E10 → E11 → E12 → E13; interleave E12 tests with each epic rather than saving them for the end.

## 11. Human-blocked tasks (seed HUMAN_TASKS.md; the agent never fakes these)

Apple Developer Program enrolment; Google Play developer account (personal vs organisation — organisation avoids the 12-tester/14-day rule but needs a D-U-N-S number); domain and DNS; production/staging Supabase projects and secrets; Sentry/analytics/push credentials; TURN provider account; CC-catalogue API keys and the Jamendo commercial-licensing decision; ODPC registration and legal review of Privacy/Terms/DPIA; business-model and pricing decisions; store listing sign-off; recruiting beta testers (Play needs 12 for 14 days if personal account); rotating any secrets found in git history; real-device and store-review verification; trademark/name check for the product name; confirmation of which launch regions to enable first.

## 12. Release checklist = Definition of Done for `COMPLETE`

1. All stories `done` (none `unverified`/`blocked` except genuine human tasks listed in HUMAN_TASKS.md).
2. Gates green on a clean checkout: install → typecheck → lint → unit → DB migrate + RLS suite → web e2e → mobile e2e (or documented human run) → secret scan → dependency audit → SAST.
3. Cross-tenant isolation suite passes for every table, bucket and realtime channel.
4. Load test report committed with measured numbers against §2 targets and the chosen Realtime plan limits.
5. Store checklist (§8) complete: deletion, report/block, contact info, privacy answers, review notes.
6. Compliance docs complete (data map, DPIA, transfer safeguards, breach runbook with VERIFIED deadline, retention schedule).
7. Backup/restore drill documented; runbooks written; cost model current.
8. `docs/VERIFICATION.md` lists, per requirement: verified by automated run (command + date) / verified manually (by whom) / not verified (why). No requirement claimed verified without evidence.
9. `.loop/HUMAN_TASKS.md` lists everything left for humans, each with exact steps.

## Appendix — sources consulted (2026-11-15)

Spotify developer policy: TechCrunch "Spotify changes developer mode API…"; Spotify Community "February 2026 Spotify for Developers update"; vorplabs Spotify CLI notes. YouTube: developers.google.com/youtube/terms/developer-policies-guide and required-minimum-functionality. Jamendo: freeapihub.com/apis/jamendo-api; jentic.com/apis/jamendo. Supabase Realtime limits: supabase.com/docs/guides/realtime/rate-limits; pricing per third-party 2026 guides (VERIFY). LiveKit pricing: apicostcalc.com/livekit.html, trtc.io comparison (VERIFY). Google Play: choicely.com and testerscommunity.com 2026 guides (VERIFY against Play Console help). Apple: developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion; App Review Guidelines 1.2; developer.apple.com/news?id=vvzx6cul (2026-10-16). Kenya: odpc.go.ke guidance note on registration; bowmanslaw.com registration insights; techafricanews.com (2026-10-19) on the Sept 2026 cross-border guidance; kenyalaw.org registration regulations. OpenCode loop practice: Ralph-loop projects (fresh context per iteration; state in git, progress file, prd.json, AGENTS.md).
