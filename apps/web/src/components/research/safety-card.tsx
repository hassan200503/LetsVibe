"use client";

import { IconArrowRight } from "@/components/icons";
import type { CrisisResource } from "@/lib/research/safety";

/**
 * Shown instead of an answer when the question signals danger (`crisis`) or the
 * answer can't be given safely (`blocked`). Crisis cards carry real phone lines
 * and nothing else — we route to help, we never counsel.
 *
 * `role="alert"`: the card is inserted into the page after the stream returns,
 * so it needs to announce itself rather than wait to be found.
 */
export function SafetyCard({ kind, message, resources }: { kind: "crisis" | "blocked"; message: string; resources?: CrisisResource[] }) {
  return (
    <div role="alert" className="card-glow mt-6 p-5 sm:p-6">
      <p className="font-semibold">{kind === "crisis" ? "Please talk to someone who can help" : "That one isn't something I can answer"}</p>
      <p className="mt-1.5 text-sm text-muted">{message}</p>
      {resources && resources.length > 0 && (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {resources.map((r) => (
            <li key={r.name}>
              <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="group flex items-center gap-3 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.92rem] font-semibold">{r.name}</span>
                  <span className="mt-0.5 block text-[0.78rem] text-muted">{r.detail}</span>
                </span>
                <IconArrowRight size={15} className="shrink-0 text-gold-ink transition group-hover:translate-x-0.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
