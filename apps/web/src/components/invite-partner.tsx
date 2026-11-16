"use client";

import { useState } from "react";

export function InvitePartner({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your invitation link", url);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={path} aria-label="Invitation link" className="field flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy} className="btn justify-center">
          {copied ? "Copied" : "Copy invite link"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Anyone with this link can join as your partner. It expires in 24 hours and stops working as soon as they join.
      </p>
    </div>
  );
}
