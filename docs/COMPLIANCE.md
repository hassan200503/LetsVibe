# Compliance map

Status: planning. This is not legal advice and not a claim of compliance. Items marked UNVERIFIED must be checked against the current official text before implementation or launch. Human owner is noted in `.loop/HUMAN_TASKS.md`.

## Apple App Store

| Requirement | What it demands | Current | Plan / evidence | Story |
| --- | --- | --- | --- | --- |
| 1.2 User-generated content (VERIFIED 2026-11-15) | Filter objectionable material, report with timely response, block abusive users, published contact info | None | Report/block + moderation queue + safety page + SLA evidence pack | E9-001, E9-002, E9-003, E13-005 |
| 1.2 NCII extension (2026-10-16 per spec) | No NCII; reporting/removal expectations | UNVERIFIED | Re-read guideline 1.2; immediate escalation path; evidence | H20, E9-002 |
| 4.8 Login services (VERIFIED) | If third-party login exists, offer an equivalent privacy-preserving option (Sign in with Apple) | N/A (custom login) | Apple + Google + email OTP; Sign in with Apple on iOS | E1-004 |
| 5.1.1(v) Account deletion (VERIFIED) | Apps with account creation must allow in-app deletion | None | Delete in-app on web and native, grace period, review notes | E1-009, E8-007, E13-004 |
| 5.1.1 Privacy policy | Privacy policy link, data collection disclosure, consent | None | Publish policy; labels match reality | E13-001, E13-002 |
| 5.1.2 Data use | Explain data use/sharing, no unapproved use | Partial | Privacy labels + subprocessor list | E13-002 |
| 2.1 App completeness | No placeholder/beta features; demo account for review | Partial | Review notes + test account | E13-008 |
| 1.2 UGC + 3.1.1 payments | If premium digital features are sold, use IAP | No billing v1 | Decide pricing before adding billing; plan IAP if needed | Open |
| ATT / tracking | Tracking requires permission and labels | None (no tracking) | Document no-tracking decision | E13-002 |
| Guideline 4.2 minimum functionality | App must not be a thin wrapper | Native calls/push/offline provide value | Review notes describe native features | E13-008 |

## Google Play

| Requirement | What it demands | Current | Plan / evidence | Story |
| --- | --- | --- | --- | --- |
| Target API 36 (VERIFIED 2026-08-31, extension to 2026-11-01) | New apps/updates target Android 16 | Unknown | Verify Expo/RN target and build config; pre-launch report | E8-010, E13-007 |
| 16 KB page size (UNVERIFIED) | Compatibility for native libs on newer devices | Unknown | Check Play help + Expo SDK; fix or upgrade | H18, E8-010 |
| Account deletion policy | In-app and web deletion path declared | None | Same deletion flow + Data Safety declaration | E1-009, E13-003 |
| User-generated content policy | Reporting/blocking/moderation, terms, contact | None | Same as Apple UGC controls | E9-001–E9-003 |
| Data safety form | Accurate collection/sharing/security | None | Complete from data map | E13-003 |
| Permissions | Minimum necessary, runtime rationale | Partial | Camera/mic/notifications audited | E8-004, E8-005 |
| Closed testing (UNVERIFIED) | Personal accounts: 12 testers / 14 days | Unknown | Decide organisation vs personal; tracker | H14, E13-006 |
| Families/children | Not child-directed; 18+ | No gate today | Age gate, rating, store answers | E9-004, E13-003 |
| Payments | Play billing for digital goods | No billing | Decide before premium launch | Open |

## YouTube API Services (VERIFIED policies 2026-11-15)

- Use the official embedded player; do not download, cache, store or offer offline playback of audiovisual content; do not modify/block ads; do not facilitate infringement.
- Link to YouTube Terms of Service and Google Privacy Policy in the app; provide a compliant privacy policy.
- Do not claim screen-share or background playback works for YouTube; verify the Requirements for Minimum Functionality (UNVERIFIED) before building (H21, E5-009).
- Store review notes must explain embedding and that calls/rooms do not capture YouTube media.

## Spotify (not integrated)

- VERIFIED 2026-11-15: Development Mode requires the owner to have Premium and allows at most 5 authenticated users; Extended Quota requires an organisation with a launched service and at least 250,000 MAU. Not viable for this product. No Spotify integration or metadata use in v1.

## Data protection (Kenya and beyond)

| Topic | Status | Action |
| --- | --- | --- |
| Kenya Data Protection Act / ODPC registration, cross-border transfer, DPIA, breach timeline | **UNVERIFIED** | Legal memo; H7/E13-009 before public launch |
| GDPR/UK GDPR applicability | **UNVERIFIED** | If EU/UK users, confirm controller/processor roles, DPA, transfer mechanism, DPO need |
| Privacy rights (access/export/delete/correct) | Planned | Implement E1-008/E1-009/E1-010; verify in staging |
| Consent records | Planned | E9-004 consent log with versions |
| Subprocessors and DPAs | Partial (providers chosen) | Collect DPAs; publish list; H4/H22 |
| Children | 18+ policy | E9-004; store ratings consistent |
| Security of processing | Planned | See SECURITY.md; incident runbook |
| Records of processing | This document + PRIVACY.md | Maintain and date |

## Child safety and illegal content

- CSAM: hash-matching provider, quarantine before partner visibility, legal reporting path, retained evidence, staff training. Legal review is blocking (H9, E6-004).
- NCII: immediate removal/escalation, trained contact, preservation limited to legal requirements (E9-002).
- Illegal-use reporting: support contact and law-enforcement process documented with counsel.

## Accessibility and consumer protection

- Target WCAG 2.2 AA on web and platform accessibility on native (E10-001/E10-002).
- European Accessibility Act and local consumer law applicability are UNVERIFIED; assess with launch countries (H5).
- Pricing, cancellation, refunds and trial disclosure must be clear before any paid plan; use store billing rules where required.
- No dark patterns: quiet hours, easy deletion, no hidden renewal.

## Records and evidence pack

Store under a controlled folder (not in the public repo): policy versions, consent screenshots, deletion recordings, moderation logs, report SLA samples, store forms, YouTube compliance checklist, legal memos, DPAs, penetration/load reports, backup-restore drill. Link each to the story that produced it.

## Store-submission gate

No submission until every P0 row above is Yes or explicitly re-scoped in `docs/PARITY.md` and approved by the human owner. The final go/no-go is `E13-010`.
