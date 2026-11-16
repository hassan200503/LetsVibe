## Story

- **Story ID:** `E?-???`
- **PRD link / section:**
- **Iteration:** `.loop/progress.md` entry

## What changed

<!-- Describe the user-visible behaviour and the implementation boundary. Keep secrets and personal data out. -->

## Acceptance evidence

<!-- Paste the exact command output or a concise summary with counts. "Should pass" is not evidence. -->

- [ ] Every acceptance criterion in the story is met
- [ ] `pnpm typegen` — pass
- [ ] `pnpm typecheck` — pass
- [ ] `pnpm lint` — pass
- [ ] `pnpm test` — pass (___ files / ___ tests)
- [ ] `pnpm build` — pass (___ pages)
- [ ] `pnpm audit --prod --audit-level=high` — pass
- [ ] Any intentionally skipped gate has an explanation and a blocker in `.loop/HUMAN_TASKS.md`

## Docs and parity

- [ ] `docs/PARITY.md` updated if behaviour or maturity changed
- [ ] Relevant architecture/security/privacy/runbook docs updated
- [ ] `.loop/prd.json` status and evidence notes updated
- [ ] `.loop/progress.md` records the iteration

## Risk, rollback and operations

- **Risk level:** low / medium / high
- **User/data impact:**
- **Rollback:** <!-- revert, restore, flag, migration down path, etc. -->
- **Monitoring / follow-up:**

## Security and privacy

- [ ] No secrets, passcodes, tokens, personal content or production data included
- [ ] Authorization is derived from the verified session; no client-supplied couple/member ID is trusted
- [ ] New data access has a cross-tenant/cross-couple test or a documented blocker
- [ ] Public/profile exposure, retention and moderation effects reviewed

## Screenshots or traces

<!-- Optional. Remove personal data and URL tokens before attaching. -->
