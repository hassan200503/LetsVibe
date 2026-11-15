# Product definition

## Vision

A private universe that a couple builds together: messages and calls, a room where they listen and watch in sync, a gallery, memories, a shared story, a daily question, and things they are learning — all in one calm place that feels made for the two of them, not for an audience.

The product starts as a handcrafted experience for one couple and grows into a trustworthy service for thousands of couples, on web, iOS and Android, without losing the intimacy that made it work.

## Problem

Couples scatter their shared life across chat apps, photo libraries, streaming services, note apps, and calls. The result is fragmented context, lost memories, and "we should watch this together" that never happens. Existing social apps are built for performance and reach; they create pressure, not privacy. Existing couple apps are shallow trackers or scrapbooks.

Our Universe is for couples who want a private, beautiful shared space with real utility: live calls, synchronised rooms, a memory that accumulates, and small rituals that bring them back to each other.

## Who it is for

Primary: committed couples (dating, engaged, married, long-distance) aged 18+, comfortable with apps, who want a private shared space and use messaging daily. Long-distance and travel-heavy couples get extra value from rooms and calls.

Secondary: couples who are curious about learning and culture together — the Discover/research features are a differentiator, not the core.

Not for: minors, groups, families, friend groups, public creators, or people looking for dating/matching. v1 is strictly two people per couple.

## Jobs to be done

1. "When we are apart, help us feel close without performing for anyone else."
2. "When we find something worth watching or listening to, let us experience it together, in sync."
3. "When something good happens, help us keep it somewhere we will find it again."
4. "When we have a free moment, give us a small ritual or a question worth answering."
5. "When we are curious, help us learn something together and remember it."
6. "When I want to revisit our life, show me the story we have built."

## Product principles

- **Private by construction.** Two members per couple, database-enforced isolation, no feed, no followers, no ads, no data sale. Privacy is an architecture decision, not a setting.
- **Ritual over engagement.** No streaks that punish absence, no infinite-scroll guilt. Notifications have quiet hours and content-free previews by default.
- **Shared, not surveillance.** Personal journals and personal worlds exist, but nothing becomes shared without an explicit choice. Presence and read receipts have privacy controls.
- **Calm, distinctive design.** Preserve the night-sky identity, restrained motion, strong typography; accessible by default and respectful of reduced motion.
- **Honest capability.** Never claim screen-share works for DRM services. Offer a shared countdown instead. Follow platform rules for YouTube and app stores.
- **Small-team operable.** One managed platform for DB/auth/storage/realtime; boring, observable operations; no bespoke servers to babysit.

## MVP scope (v1)

- Accounts: email OTP/magic link, Apple, Google; one partner invite; onboarding; recovery; session management.
- Isolation: couples and members, RLS on every table/bucket/channel, cross-couple regression tests, export and deletion.
- Core couple life: home/journey, daily question, chat (text, image, voice note, replies, reactions, receipts, typing), 1:1 voice/video calls with ringing, presence, Together room (YouTube, uploads, podcast audio, queue, chat), gallery, Our Story, learning list, Discover feed, research, search, digest, settings.
- Mobile: Expo app with parity for auth, home, chat, calls, gallery, rooms, settings, export/deletion.
- Trust: report/block, moderation queue, age gate, consent, rate limits, CSAM scanning, privacy/terms/safety pages.
- Operations: staging/production, observability, backups, load tests, cost controls, SLOs.

### Explicitly not in v1

Group couples; couples matching; public social features; advertising/tracking; Spotify integration; downloading/offline caching of YouTube or streaming content; DRM circumvention; recording calls; premium billing (entitlement model only); languages beyond English (scaffold only); Android tablet/desktop-specific layouts beyond responsive web.

## Success metrics

North star: **weekly couples who share at least one meaningful moment** (a message thread, a call, a room session, a memory or a answered question) with their partner.

Guardrails:

- Cross-tenant incidents: **zero**.
- p95 chat delivery < 500 ms; call setup < 5 s; room sync within 400 ms audio / 700 ms video (targets, measured at 1,500 concurrent).
- Store rating ≥ 4.5; crash-free sessions ≥ 99.5%.
- D30 couple retention (both members active) — baseline to be set after beta; target ≥ 40% as a hypothesis.
- Support/report first response within SLA (target 24 h, urgent NCII immediately).
- Cost per active couple within the approved budget; no unbounded AI/TURN/storage spend.

These are targets, not measured facts. Baseline after beta; report honestly.

## Pricing hypotheses (not decided)

- Free tier with generous core features and modest storage/AI limits; premium later for larger storage, higher AI limits and advanced rooms.
- No ads, ever. No selling data. Prefer subscription.
- Everything in the entitlement model (E1-012) is server-side and reversible; do not build billing until pricing is approved.

## User journeys

1. **Claim and invite:** existing couple claims accounts by email; new user signs up, attests 18+, accepts terms, invites partner; partner accepts; both onboard (names, start date, time zone, topics, notifications).
2. **Daily ritual:** home shows journey, verse, days together and the question; both answer; reveal; archive.
3. **Apart:** chat with realtime delivery, push, media; call rings on both devices; call quality degrades gracefully.
4. **Together, apart:** one partner starts a room with a YouTube video, upload or podcast; the other joins; playback stays in sync; queue/reactions; mini-player follows.
5. **Keep it:** add a memory, upload photos/videos/songs, react/comment, add to story; export or delete at any time.
6. **Curious:** Discover feed per couple; save items; research with Gemini/OpenAlex; save to learning; weekly digest.
7. **Leave safely:** block/report; export; delete account with grace; partner notified; complete purge.

## Constraints and dependencies

- Team: 1–3 people; autonomous loop builds, humans approve legal, billing, store and production actions.
- Stack: Next.js web, Expo mobile, Supabase Postgres/Auth/Storage/Realtime, Drizzle, Vercel Pro, P2P WebRTC + TURN (ADR-001).
- Verified platform limits: Supabase Realtime Free/Pro-default 200/500 connections — the default Pro spend cap is insufficient for 1,500 concurrent users; Google Play requires API 36 from 2026-08-31; Apple 1.2/5.1.1(v) requirements; Spotify dev mode is 5 users and not viable.
- Unverified: Kenya ODPC specifics, Jamendo commercial terms, LiveKit pricing, Expo API 36/16 KB support, Supabase realtime authorization details. See `docs/VERIFICATION.md`; do not state these as facts.

## Risks

- **Isolation failure** is existential; mitigated by RLS + tests, not review alone.
- **Cost/scaling of realtime and media** can outrun a small team; mitigated by plan sizing, quotas, load tests and budget alerts.
- **Store rejection** for UGC, deletion, login or privacy gaps; mitigated by E9/E13 evidence packs.
- **Legal uncertainty** (Kenya, CSAM, music); do not launch paid/public until human sign-off.
- **Scope creep** into a social network; refusals are explicit above.
- **Two UI codebases** (web and native) demand discipline; share logic/types, not pixels.

## Open product questions

1. Product name, domain and visual identity beyond the current "Our Universe" theme.
2. Launch countries and languages after English.
3. Free-tier limits and premium pricing.
4. Whether Discover/research is core for launch or a later differentiator.
5. Whether to support long-distance time-zone rituals beyond the daily question.
6. Which licensed music catalogue (if any) is commercially viable.
