"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHeadphones, IconMessage, IconSparkle } from "@/components/icons";
import { usePulse } from "@/components/pulse";

/** Together has three rooms: the player, your messages and the rituals you keep. */
export function TogetherTabs() {
  const path = usePathname();
  const unread = usePulse().data?.chat?.unread ?? 0;
  const tabs = [
    { href: "/together", label: "Listen", long: " & watch", full: "Listen & watch", Icon: IconHeadphones, on: path === "/together" },
    { href: "/together/chat", label: "Messages", full: "Messages", Icon: IconMessage, on: path.startsWith("/together/chat"), badge: unread },
    { href: "/together/rituals", label: "Rituals", full: "Rituals", Icon: IconSparkle, on: path.startsWith("/together/rituals") },
  ];
  return (
    <nav aria-label="Together" className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-sm">
      {tabs.map(({ Icon, ...t }) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.on ? "page" : undefined}
          aria-label={t.full}
          className={`flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:px-4 ${t.on ? "bg-ink text-bg shadow" : "text-muted hover:text-ink"}`}
        >
          <Icon size={16} /> {t.label}
          {t.long && <span className="hidden sm:inline">{t.long}</span>}
          {!!t.badge && <span className="rounded-full bg-success px-1.5 text-[0.65rem] font-bold leading-4 text-success-ink">{t.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
