# PLAN — Let'sVibe to production (web + mobile)

Written 2026-11-18 on `autonomous/couples-v2` at `7666c75`. This is the plan of record for the
remaining work. `.loop/prd.json` stays the backlog of record; this file adds the **phase, order,
exit criteria and human frontier** that the story list alone does not express.

Remaining work: **135 stories** (131 `todo`, 4 `in_progress`). Done: 14.

---

## 0. Verdict on "ship today" — read this first

Two different things are being asked for, and they have different answers.

**Ship today — possible:** as many green, committed, verifiable increments on the critical path as
the machine and I can produce, ending with the app provably multi-couple-safe at the code level and
a precise list of the human steps that remain.

**Ship today — impossible, and pretending otherwise would be dishonest:**

| Blocked on | Why it cannot be done by an agent today |
| --- | --- |
| Supabase staging + production projects (**H2**) | Every remaining isolation, auth, storage and realtime story targets Supabase. Without the projects there is no production database. |
| Budget approval (**H3**) | Vercel Hobby is non-commercial. There is no legal place to run this for real users today. |
| Transactional email + sender domain (**H4**) | Real sign-in is email OTP. No sender domain, no onboarding. |
| Product identity, domain, legal entity (**H5**) | Policies, store listings and data regions all depend on it. |
| Legal review: ODPC, DPIA, cross-border (**H7**), Privacy/Terms/Community Guidelines (**H8**), CSAM scanning (**H9**) | Store submissions and lawful processing of couple data. A human must sign these. |
| Apple Developer (**H14**), Google Play (**H15**), Expo/EAS (**H16**) | Accounts cannot be created by an agent. |
| Play closed testing, 12 testers × 14 continuous days (**H19**) | A calendar constraint. It cannot be compressed. |
| A native app (**E8**, 12 stories, 0 done) | Does not exist. Native parity is an epic, not an afternoon. |

The loop contract also forbids the one thing "deploy today" literally means: **production deploys,
store submissions and paid calls are human steps** (PROMPT.md §6, HANDOFF §9). So the realistic
definition of today is: *drive the agent-doable critical path to green, commit each story, and hand
over an exact, tested checklist for the human half.*

---

## 1. What "production ready" actually means here

**Web** — MASTER_SPEC §12, all nine items. In short: every story done; gates green on a clean
checkout; **cross-tenant isolation proven for every table, bucket and channel**; load-test numbers
committed against §2 targets; store checklist done; compliance docs complete; backup/restore drill
documented; `docs/VERIFICATION.md` honest per requirement; `HUMAN_TASKS.md` holds everything left.

**Mobile** — two tiers, and today only tier 1 is reachable:

1. **Launch tier (PWA).** The installed PWA *is* the mobile app. Installability, safe areas, offline
   shell, push on iOS (Add-to-Home-Screen) and Android, cold start < 2.5 s on a mid-range device,
   360 px layouts. New epic **E15**.
2. **Native tier (E8).** Expo/React Native reusing `packages/domain` and `packages/ui-tokens`, no
   second palette. Starts only after E1-003 and E0-002; needs H14/H15/H16/H19/H21.

---

## 2. The phases

Ordering follows MASTER_SPEC §10: foundations → tenancy and security → parity → feature modules →
safety/compliance → quality → release.

| Phase | Theme | Stories | Agent-doable now? | Human gate |
| --- | --- | --- | --- | --- |
| **P0** | A pipeline you can trust | E0-003, E0-008, E0-010, E0-005, E0-006, E9-011 | Mostly — E0-006 needs H2 | H1, H30 |
| **P1** | Tenancy you can prove | E2-001 → E2-002 → E2-003 → E2-004, E2-005, E2-006, E2-008, E1-002, E12-004, E12-001 | Partly — RLS needs H2 | H2 |
| **P2** | Real identity | E1-003, E1-004, E1-005, E1-006, E1-007, E1-010, E1-011, E1-014, E1-015 | No — needs H2/H4 | H2, H4, H6 |
| **P3** | Safety, privacy & the compliance floor | E1-008, E1-009, E9-001…E9-010, E9-012, E13-001, E13-004, E13-005, E13-009, E13-011 | Yes for the code; drafts for policy | H7, H8, H9, H12, H13 |
| **P4** | Media vault, realtime, calls, rooms | E6-001…E6-008, E2-007, E3-001…E3-016, E4-001…E4-009, E5-001…E5-013 | No — needs Supabase Storage/Realtime | H17 |
| **P5** | The public commons | E14-001…E14-012 (new) | Partly — design now, build after P1 | H8, H9 |
| **P6** | Mobile | E15-001…E15-006 (PWA, new), then E8-001…E8-012, E12-003, E12-008, E12-010, E10-002, E10-004 | PWA yes; native no | H14–H16, H19, H21 |
| **P7** | Quality, performance, release | E11-001…E11-008, E12-002, E12-005…E12-007, E12-009, E10-003, E13-002, E13-003, E13-006…E13-008, E13-010, E1-016 | No — needs staging + stores | H3, H18, H20 |

### Phase exit criteria

- **P0** — CI runs install → typegen → typecheck → lint → unit → build → secret scan → dependency
  audit → SAST on every PR, and `CI / check` is the required status. Flags evaluate server-side
  with unfinished features off by default. A health endpoint and structured logs exist.
- **P1** — every couple-owned table carries `couple_id`; the app resolves the couple only from the
  verified session; a cross-couple regression suite runs in CI and fails the build if any query,
  bucket or channel can reach another couple's data. **This is the gate that makes real users safe.**
- **P2** — a new couple can sign up with a real email, invite a partner, onboard and use the product
  without a human touching the database.
- **P3** — export, deletion, report, block, moderation, age gate and consent records all work, and
  the policy/legal drafts are complete for a human to sign.
- **P4** — media lives in couple-scoped Storage with signed URLs and EXIF stripping; chat, calls and
  rooms use durable-write-then-broadcast on private channels with a polling fallback.
- **P5** — a couple can publish a moment and another couple can view, react, comment and follow,
  behind an explicit two-person opt-in, with a second documented visibility gate.
- **P6** — the installed PWA is verified on real iOS and Android (install, push, offline, cold
  start); the native app reaches parity.
- **P7** — MASTER_SPEC §12 items 1–9 verified with real numbers; `.loop/STATUS` = `COMPLETE`.

---

## 3. Critical path

The dependency graph has one bottleneck: **everything real depends on P1** and **P1's RLS half
depends on H2**. So the order is:

1. `E0-010` feature flags — small, unblocked, needed by the commons and the paywall.
2. `E0-003` secret scanning + dependency audit + SAST in CI.
3. `E2-001` the `relationship_id` → `couple_id` contract step (split if it exceeds one iteration).
4. `E2-004` remove the remaining single-couple resolution paths.
5. `E2-002` → `E2-003` → `E12-004` RLS + cross-couple regression suite in CI *(once H2 lands — until
   then these stay `blocked` with exact human instructions, never faked).*
6. `E1-008` export → `E1-009` delete *(store blockers, independent of Supabase)*.
7. `E9-001` report/block, `E9-004` age gate + consent log, `E9-005` rate limiting, `E9-002`
   moderation queue — the safety floor, all local.
8. `E13-001` policy/Terms/Guidelines drafts for human sign-off.
9. PWA hardening (`E15-*`) — the reachable half of "mobile".
10. The commons (`E14-*`) behind opt-in.

---

## 4. The human frontier (the half I cannot do)

Nothing below can be substituted by code. Each already has an entry in `.loop/HUMAN_TASKS.md`.

- **Unblocks P1/P2:** H2 Supabase staging + production projects · H4 email provider + sender domain
  · H6 approve the pilot-account claim migration · H30 protect `main` and require `CI / check`.
- **Unblocks P3/release:** H7 legal review (ODPC, DPIA, cross-border) · H8 Privacy/Terms/Community
  Guidelines · H9 CSAM scanning provider · H12 age and consent policy · H5 product identity/domain.
- **Unblocks P6/release:** H14 Apple Developer · H15 Play account type · H16 Expo/EAS · H19 12
  testers for 14 days · H21 real-device matrix · H20 listing sign-off.
- **Unblocks P7:** H3 approved budget and vendor list · H18 Sentry/analytics/push credentials ·
  H17 TURN account and cost cap.
- **Verification the loop must do, not guess:** H25 Play 16 KB/12-tester rules · H26 Supabase
  Realtime authorization · H27 Apple 1.2 NCII text · H28 current vendor pricing.

---

## 5. Execution log

| # | Story | Status | Evidence |
| --- | --- | --- | --- |
| 1 | E1-017 Shared rituals | done | commit `7666c75`; 17/17 golden path, a11y 0 light+dark, motion 0, 4 gates green — see `.loop/progress.md` iteration 016 |
| 2 | E2-001 couple_id tenancy | done | commit `b88ef90`; generated matrix foundation, 19 files / 225 tests — iteration 019 |
| 3 | E2-004 session-only context | done | commit `d1507ca`; 10 context tests, cross-couple 404s — iteration 020 |
| 4 | E2-003 cross-couple matrix | done | commit `17bec37`; 93 matrix + 10 storage + 6 route tests, 225 total — iteration 021 |
| 5 | E2-005 visibility & public profile | done | couple-scoped slugs, opaque public handle, allowlisted reader, 234 tests — iteration 022 |
| 6 | E5-013 sync protocol & simulator | done | `@letsvibe/sync-protocol` 18 tests, p95 280-326 ms across wifi/mobile/poor, provider wired — iteration 023 |
| 7 | E3-007 chat photos & voice notes | done | `media.origin` split, 7 attachment integration tests + 6 waveform tests, 247 web tests — iteration 024 |
| 8 | E17-002 repository review agent | done | `pnpm review:agent`, 19 fixture tests, 0 findings on a 220-file branch diff, 266 web tests — iteration 025 |
| 9 | E1-016 flag-gated paywall | done | `/premium` 404s behind the `paywall` flag, entitlement-driven comparison, disabled CTA, ADR-003, 6 tests, 273 web tests — iteration 026 |
