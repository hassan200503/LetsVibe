"use client";

import { useActionState, useState, useTransition } from "react";
import { createPartnerInvite, revokePartnerInvite } from "@/lib/actions/personal";

/**
 * Partners are invited with a bearer link that exists in clear only in this
 * reply. Creating another link revokes the previous one.
 */
export function InvitePartner() {
  const [state, create, pending] = useActionState(createPartnerInvite, null);
  const [revokedPath, setRevokedPath] = useState<string | null>(null);
  const [copying, startCopy] = useTransition();
  // A token is unique, so a later create wins over an earlier revoke without
  // needing to reset state from an effect.
  const path = state?.invitePath && state.invitePath !== revokedPath ? state.invitePath : null;

  function copy() {
    if (!path) return;
    const url = new URL(path, window.location.origin).toString();
    startCopy(async () => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        window.prompt("Copy your invitation link", url);
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {path ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={path} aria-label="Invitation link" className="field flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy} disabled={copying} className="btn justify-center">
              {copying ? "Copying…" : "Copy invite link"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action={create}>
              <button className="btn btn-ghost" disabled={pending}>
                {pending ? "Creating…" : "Create a new link"}
              </button>
            </form>
            <form
              action={async () => {
                await revokePartnerInvite();
                setRevokedPath(path);
              }}
            >
              <button className="text-xs text-muted underline underline-offset-4 hover:text-red-600">Revoke this link</button>
            </form>
          </div>
        </>
      ) : (
        <form action={create}>
          <button className="btn" disabled={pending}>
            {pending ? "Creating…" : "Create invite link"}
          </button>
        </form>
      )}
      {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {revokedPath && !path && <p role="status" className="text-sm text-muted">The old link no longer works. Create a new one whenever you&apos;re ready.</p>}
      <p className="text-xs leading-relaxed text-muted">
        This link can be used once, by one person, and expires after 7 days. Deleting it or creating another link stops it working immediately. Only its fingerprint is stored — keep the
        link somewhere private until your partner joins.
      </p>
    </div>
  );
}
