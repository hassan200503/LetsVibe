"use client";

import { useCallback, useState, useTransition } from "react";
import { keepAllToday, toggleRitual } from "@/lib/rituals/actions";
import type { RitualView } from "@/lib/rituals/queries";
import { buzz } from "@/lib/ui/buzz";

/**
 * Keeping a ritual should feel instant. The tap flips locally the moment your
 * finger lands, and the server catches up behind it — if it refuses, the tap
 * quietly undoes itself rather than leaving a lie on screen.
 */
export function useRitualTaps(rituals: RitualView[]) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const kept = useCallback((r: RitualView) => optimistic[r.id] ?? r.mine, [optimistic]);

  const toggle = useCallback(
    (r: RitualView) => {
      const next = !(optimistic[r.id] ?? r.mine);
      setOptimistic((o) => ({ ...o, [r.id]: next }));
      if (next) buzz(10);
      start(async () => {
        const res = await toggleRitual(r.id).catch(() => ({ ok: false as const, error: "Couldn't save that — try again" }));
        if (!res.ok) {
          setOptimistic((o) => ({ ...o, [r.id]: !next }));
          setError(res.error ?? "Couldn't save that — try again");
        } else {
          setError(null);
        }
      });
    },
    [optimistic, start],
  );

  const keepAll = useCallback(() => {
    const ids = rituals.filter((r) => r.cadence === "daily" && !(optimistic[r.id] ?? r.mine)).map((r) => r.id);
    if (!ids.length) return;
    setOptimistic((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    start(async () => {
      await keepAllToday(ids).catch(() => setError("Couldn't save that — try again"));
    });
  }, [rituals, optimistic, start]);

  const openToday = rituals.filter((r) => r.cadence === "daily" && !(optimistic[r.id] ?? r.mine)).length;

  return { pending, kept, toggle, keepAll, openToday, error };
}
