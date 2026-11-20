"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorldTabs({ base, tabs }: { base: string; tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="World sections" className="no-scrollbar -mx-4 mt-7 flex gap-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      {tabs.map((t) => {
        const href = `${base}${t.href}`;
        const active = t.href === "" ? path === base : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-sm transition-colors ${active ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
