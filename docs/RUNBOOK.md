# Runbook

Operational guide for the target architecture. Commands for today's single-couple app are included; target steps activate as stories land. Never run production commands from the autonomous loop.

## Environments

| Env | Web | Mobile | Data | Access |
| --- | --- | --- | --- | --- |
| Local | `pnpm dev` (`apps/web`) | Expo dev client | PGlite `apps/web/.data/` or Supabase local | Developer |
| Staging | Vercel staging domain | EAS preview channel | Supabase staging project | Team + loop (staging creds only) |
| Production | Vercel Pro custom domain | TestFlight/Play internal → staged rollout | Supabase production project | Human owner only |

## Secret names (values never in git)

`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `GEMINI_API_KEY`, `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`, `BLOB_READ_WRITE_TOKEN` (legacy until E6-007), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `EMAIL_API_KEY`, `SENTRY_DSN`, `EXPO_ACCESS_TOKEN`, `SESSION_SECRET` (legacy until E1-003). Keep `.env.example` in sync; use the platform's encrypted env store.

## Local development

```powershell
pnpm install
pnpm typegen
pnpm dev               # http://localhost:3000
pnpm test
pnpm lint
pnpm build
```

- PGlite permits one process at a time: stop the dev server before seed/migrate scripts, or use Supabase local after E0-007.
- Reset local data by deleting `apps/web/.data/` (never do this in staging/production).
- If typecheck complains about `PageProps`/`RouteContext`, run `pnpm typegen` first.
- Vercel/Netlify must use `apps/web` as the project root/base directory; pnpm installs the workspace from the repo root.

## Web deploy

1. CI green on the story branch; PR reviewed per loop contract.
2. Merge to main → Vercel builds staging. Verify `/api/health`, sign-in, chat send, upload, call stub.
3. Production promotion is a human action after approval. Record the deployment URL and commit SHA.
4. Rollback: promote the previous deployment. DB migrations must be backward compatible for one release (expand/contract).

## Database migrations

- Never edit an applied migration. Add a new one.
- Apply to a staging copy first; verify row counts and policies.
- Production: take a backup/PITR checkpoint, run during low traffic, monitor errors, roll forward is preferred over down migrations.
- Destructive changes require a written plan and the human owner's approval.
- After schema changes: regenerate types (`npx drizzle-kit generate` is not used for policies; keep SQL policies in versioned migrations) and run the RLS suite.

## Mobile builds

```powershell
cd apps/mobile
npx eas build --profile preview --platform all
npx eas build --profile production --platform all
npx eas submit --platform ios        # human only
npx eas submit --platform android    # human only
```

- Production submits, store metadata and rollout percentages are human actions.
- OTA updates only for JS-safe changes; never bypass store review for native changes.
- Keep build numbers unique; record commit SHA in the release notes.

## Health and monitoring

- `/api/health` (web): checks DB connectivity, storage read and build version; no secrets.
- Dashboards: Sentry error rate; Supabase connections/CPU/storage; Vercel error/latency; TURN usage; AI spend; email failures.
- Alerts page the on-call channel. Thresholds live with the alert config, not here.

## Common problems

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `typecheck` fails on fresh clone | Missing Next generated types | `pnpm typegen`, then rerun |
| PGlite "already open"/lock | Another process holds `apps/web/.data/` | Stop dev server/scripts |
| Login loop | Cookie/domain mismatch or stale session | Clear cookies; check Supabase redirect URLs and middleware |
| OTP email missing | Sender domain/DKIM or provider outage | Check email provider logs; verify DNS; rate-limit resend |
| Realtime disconnected | Network/token/plan limit | Client reconnects; check Supabase connection count vs plan |
| Upload 413/403 | Size/MIME or bucket policy | Check limits, `couple_id` path, signed URL expiry |
| Call connects but no audio | ICE/TURN or permissions | Check TURN creds, mic permission, force relay test |
| AI 429/over quota | Entitlement or provider limit | UI shows reset/guidance; check usage ledger |
| Weekly digest not sent | Cron/time zone/preference bug | Inspect job logs; verify couple time zone |
| Delete request stuck | Purge worker failure | Retry queue, then manual script with audit |

## Incidents

1. Declare severity (SEV1 cross-tenant/abuse; SEV2 outage/data loss; SEV3 degraded; SEV4 minor) and open a channel.
2. Contain: revoke sessions/keys if compromised; disable the affected feature flag; block abusive accounts.
3. Preserve evidence (logs, audit, object versions) before cleanup; do not copy private content into tickets.
4. Notify the human owner immediately for SEV1/SEV2. Legal notification timelines follow counsel and local law (Kenya pending).
5. Communicate status without exposing personal data.
6. Write a blameless post-incident review with timeline, impact, root cause, fixes and owners within 5 business days.

## Backup and restore

- Supabase PITR: confirm plan/window; restore to a new project, verify row counts and storage checksums, then repoint.
- Storage: verify object versioning/backups; deleted media purge must be verified against backups policy.
- Rehearse quarterly (E11-003); record RPO/RTO.

## Secret rotation

1. Add the new secret with the provider; deploy to staging and verify.
2. Deploy production during low traffic.
3. Revoke the old secret; confirm no errors.
4. Update the inventory with date/owner (E9-006).

## Cost and abuse controls

- Watch storage bytes, AI tokens, TURN relay minutes and email volume per couple.
- Conservative new-account limits; anomaly alerts; support can block with audit (E11-006).
- Budget alerts at 50/80/100% of the approved cap (H3).

## Launch window

Follow `E13-010`: all P0 stories done, rollback tested, support staffed, monitoring live, legal sign-off recorded. Keep a human in the loop for the first production week.
