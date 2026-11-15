# Architecture

Status: target architecture accepted for planning (ADR-001); implementation begins at E0-002/E1. Nothing here describes production changes already made.

## Today (single-couple)

```text
Browser / installed PWA
  |  HTTP polling every 0.6–3 s, server actions
  v
Next.js 16 on Vercel Hobby  ──────────────►  Vercel Blob (private)
  |  Drizzle ORM                              (global store, rel/<relationshipId>/…)
  v
Neon Postgres (prod) / PGlite (.data, local)
  ▲
  │ scheduled ingest every 2 h
GitHub Actions ──► 39 RSS/iNaturalist feeds, Gemini REST, OpenAlex
```

- Auth is a custom HS256 JWT cookie; tenancy is app-level (`relationship_id` + `visibleTo()`), with no RLS.
- Chat, room sync, call signalling and presence all poll; several polls write on every tick.
- Calls are P2P WebRTC; SDP/ICE rows are exchanged by polling.
- One deployment-global Gemini key and TURN relay live in `kv`.

## Target (multi-couple)

```text
apps/web (Next.js, Vercel Pro)        apps/mobile (Expo, EAS)
        │                                     │
        └────────── packages/ ────────────────┘
          domain · api-client · sync-protocol · ui-tokens · i18n · config
                          │
                          v
              Supabase (staging / production, separate projects)
              ├─ Auth: email OTP, Apple, Google
              ├─ Postgres + RLS (default deny) + Drizzle migrations
              ├─ Storage: private buckets, couple paths, signed URLs
              └─ Realtime: private channels, presence, broadcast
                          │
        ┌─────────────────┼──────────────────┬─────────────────┐
        v                 v                  v                 v
   TURN (calls)     Transactional email   Sentry          AI providers
   short-lived      OTP, export, delete   errors/traces   Gemini, OpenAlex
   per-call creds
```

Scheduled ingest remains a GitHub Action until E7-002 evaluates Supabase Cron; no extra job runner is introduced without an ADR.

## Tenancy model (the invariant)

Every couple-owned row has `couple_id uuid not null references couples(id)` with an index. Membership is `couple_members(couple_id, user_id, role, status)` with at most two active members. Authorization is enforced three times:

1. **Session → membership** on the server (never from request input).
2. **Postgres RLS** on every table, including Realtime authorization and Storage policies.
3. **Route/action checks** for UX-specific rules (e.g. only sender edits a message).

Core SQL shape (reproduced for review, not yet applied):

```sql
create function public.is_couple_member(target uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target and user_id = auth.uid() and status = 'active'
  );
$$;

alter table public.messages enable row level security;
create policy messages_member_all on public.messages
  for all using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
```

Rules:

- Default deny. No table ships without RLS, policies and a cross-couple test (E2-002/E2-003).
- Service-role keys are server-only and never used for user-facing reads where a user client suffices.
- Storage paths are `<couple_id>/<object>`; policies validate the first path segment and member status.
- Realtime private channels authorize through RLS on `realtime.messages`; channel names are not authorization.
- Foreign keys keep references inside the same couple where composite keys are practical; otherwise triggers/tests enforce it.

### Data model changes

New: `couples`, `couple_members`, `invitations`, `profiles`, `consents`, `entitlements`, `usage_ledger`, `reports`, `moderation_actions`, `audit_log`, `export_jobs`, `deletion_requests`.

Existing 32 tables stay conceptually the same; `relationships` becomes `couples`, `relationship_members` becomes `couple_members`, and `relationship_id` is replaced by `couple_id` after an expand/backfill/contract migration (E2-001, E11-007). `people` becomes a profile linked to `auth.users`; slug is no longer a login.

## Authentication and sessions

- Supabase Auth handles OTP, OAuth, refresh, revocation and rate limits. Server components and route handlers verify the access token and resolve membership per request.
- Native apps use deep links for OTP/OAuth and store refresh tokens in secure storage (Keychain/Keystore), never AsyncStorage.
- Web sessions remain cookies (httpOnly, Secure, SameSite=Lax) through the Supabase SSR helpers.
- Existing accounts have no email on file; a one-time claim flow maps them to verified emails before passcode login is removed (E1-003).
- Sign in with Apple is mandatory where other third-party logins exist on iOS (Guideline 4.8).

## Realtime protocol

- One private channel per couple, suffixed by concern: `couple:<uuid>:chat`, `:room`, `:call`, `:presence`.
- **Durable first:** messages, reactions, room state snapshots and call lifecycle events are rows written server-side, then broadcast (or delivered via Postgres changes). Broadcasts alone never carry the only copy of durable data.
- **Ephemeral:** typing, presence, cursor/nudge, drift pings use broadcast with throttle/expiry.
- Clients reconcile on reconnect with a cursor (`updated_at`/sequence) and refetch missed rows; the system is at-least-once and idempotent (`client_id`).
- A polling fallback remains behind a flag for old clients and degraded networks.

### Capacity assumptions (verify with load tests)

| Assumption | Value | Consequence |
| --- | --- | --- |
| Couples / users | 10,000 / 20,000 | Storage and AI quotas dominate cost, not row counts |
| Concurrent users at peak | 1,500 (7.5% of users) | ~1,500 WebSocket connections, 2–4 channels each |
| Realtime joins at peak | ~2.5/s | Well under Pro limits |
| Messages at peak | ~10/s | ~20–40 DB writes/s with receipts; bounded |
| Media rooms | 300 concurrent | One channel each; playback traffic goes to YouTube/CDN, not us |
| Call concurrency | 150 | P2P; TURN only for failed NAT pairs (~10–20% assumption) |
| Storage | 1 GB/couple average (quota-limited) | ~10 TB total; requires paid tier and lifecycle rules |

Supabase Realtime official limits (verified 2026-11-15): Free 200 connections / 100 msg/s / 100 joins/s; Pro default 500 / 500 / 500; Pro with spend cap removed 10,000 / 2,500 / 2,500; Team 10,000 / 2,500 / 2,500. Therefore the **default Pro plan cannot serve 1,500 concurrent users**; the plan tier must be chosen with the spend cap lifted (or Team), and alerts set.

## Media pipeline

1. Client requests an upload reservation (couple, filename, MIME, size).
2. Server validates quota/entitlement, sniffs MIME, reserves bytes and returns a Storage resumable (TUS) endpoint plus path.
3. Upload goes directly to Storage; a finalize action verifies object metadata, strips EXIF, generates thumbnails, scans for prohibited content and marks the row visible.
4. Playback uses short-lived signed URLs (or signed CDN URLs); deletes remove the row, object and cached derivatives.

Limits: quotas from `entitlements`; v1 starts conservative (E6-003) instead of today's per-file-only 25/30/150 MB. Legacy Blob and base64 `photos` migrate with checksums (E6-007, E2-007).

## Calls

- 1:1 only. Client A sends an offer over the private call channel; B rings via push (CallKit/ConnectionService on native, Web Push + in-app on web); answer/ICE exchanged over the channel; media is P2P (DTLS-SRTP).
- TURN credentials are short-lived and per-call, issued after membership and rate checks. No global relay secret is sent to clients.
- ICE restart on network change; audio-only fallback; call state machine is server-timed to avoid split-brain.
- No recording in v1; no group calls. LiveKit remains an option if screen-share/group requires an SFU (new ADR).

## AI and content

- Research calls Gemini server-side with retrieval context and OpenAlex citations. Quotas/cost are enforced by entitlement and `usage_ledger`; optional BYO keys are encrypted at rest and never returned.
- Untrusted feed/web text is fenced as data, not instructions; outputs are moderated; crisis messages route to external help.
- Feed ingestion is idempotent, retries with backoff, stores source/licence/attribution, and never proxies YouTube media.
- YouTube uses the official embedded player; no downloads, no background play, no ad modification.

## Environments and deployment

| Environment | Web | Mobile | Data |
| --- | --- | --- | --- |
| Local | `apps/web` dev, PGlite or Supabase local | Expo dev client | disposable |
| Staging | Vercel preview/staging | EAS preview channel | Supabase staging project |
| Production | Vercel Pro (human-approved) | EAS production + stores | Supabase production project |

- Migrations: expand → backfill → dual-read/write → contract, tested on prod-like data; never destructive in one step.
- Web rollback: promote the previous Vercel deployment; DB changes must remain backward compatible for one release.
- Mobile rollback: staged rollout halt; OTA only for JS-safe fixes; store binaries are immutable.
- Secrets per environment; no production credentials on the loop's machine (E0-006).

## Observability and SLOs

- Sentry for errors/traces (no message/media content), structured logs with request/couple ids (hashed/pseudonymous), health endpoint.
- SLOs: 99.9% web availability; p95 chat delivery < 500 ms; call setup success ≥ 98%; room sync p95 within target; crash-free sessions ≥ 99.5%.
- Alerts: error rate, Realtime connection saturation near plan cap, DB CPU/connections, storage quota anomalies, AI/TURN spend, failed deletions, backup failures.

## Key failure modes

| Failure | Expected behaviour |
| --- | --- |
| Realtime outage | Clients fall back to polling, show a subtle degraded badge; no data loss |
| Auth provider outage | Existing sessions keep working until expiry; new sign-ins show a clear retry |
| Storage/CDN outage | Existing signed URLs may fail; uploads queue/retry; no partial visibility |
| TURN outage | Calls fail with a clear message; chat unaffected; alert |
| AI quota/cost spike | Requests fail closed with guidance; BYO key option; admin alert |
| Email delay | OTP retry + resend controls; export/deletion queued, not lost |
| Bad migration | Expand/contract and tested rollback; staging rehearsal mandatory |

## Open decisions

- Expo SDK version and API 36/16 KB support (E8-010; unverified).
- Supabase plan tier and spend-cap setting (H2; verified limits, unknown final price).
- Transactional email provider and sending domain (H4).
- Licensed music catalogue vs uploads/podcasts only (H10; unverified terms).
- Supabase Cron vs GitHub Actions for ingest after E7-002.
- Screen-share/group calls via LiveKit only if evidence justifies it (new ADR).
- Offline cache scope on native (metadata only vs encrypted media).
