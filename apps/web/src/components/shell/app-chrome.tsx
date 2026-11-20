"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/avatar";
import {
  IconBook,
  IconCompass,
  IconFlask,
  IconGrid,
  IconHeadphones,
  IconHome,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSettings,
  Monogram,
} from "@/components/icons";
import { PresencePill } from "@/components/presence-pill";
import { usePulse } from "@/components/pulse";

export type ChromeMember = { id: string; slug: string; displayName: string; theme: string; avatarUrl?: string | null };
export type NavIcon = "home" | "story" | "gallery" | "together" | "discover" | "research";
export type NavKind = "home" | "story" | "gallery" | "together" | "discover" | "research";
export type PrimaryNav = { href: string; label: string; icon: NavIcon; kind: NavKind; badge?: "gallery" | "messages" };

const ICONS = {
  home: IconHome,
  story: IconBook,
  gallery: IconGrid,
  together: IconHeadphones,
  discover: IconCompass,
  research: IconFlask,
} as const;

function isActive(kind: NavKind, path: string) {
  switch (kind) {
    case "home":
      return path === "/" || path.startsWith("/world");
    case "story":
      return path.startsWith("/story");
    case "gallery":
      return path.startsWith("/gallery");
    case "together":
      return path.startsWith("/together");
    case "discover":
      return path.startsWith("/discover") || path.startsWith("/learning") || path.startsWith("/digest");
    case "research":
      return path.startsWith("/research");
  }
}

function badgeFor(kind: NavKind, gallery: number, unread: number) {
  if (kind === "gallery") return gallery;
  if (kind === "together") return unread;
  return 0;
}

export function AppChrome({ brand, me, members, primary }: { brand: string; me: ChromeMember; members: ChromeMember[]; primary: PrimaryNav[] }) {
  const path = usePathname();
  const { data } = usePulse();
  const galleryUnseen = data?.unseenGallery ?? 0;
  const unread = data?.chat?.unread ?? 0;
  const partnerInRoom = data?.partners.some((p) => p.place === "room") ?? false;
  const onChat = path.startsWith("/together/chat");
  const worlds = members.map((m) => {
    const own = m.id === me.id;
    return {
      href: `/world/${m.slug}`,
      label: own ? "Your world" : `${m.displayName.split(" ")[0]}'s world`,
      active: path.startsWith(`/world/${m.slug}`),
      person: m,
    };
  });

  return (
    <>
      {/* ── Desktop: persistent rail. Compact below 1280px, labelled above. ── */}
      <aside
        aria-label="Lovora"
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line/80 bg-canvas/80 backdrop-blur-xl md:flex md:w-[var(--space-rail-compact)] xl:w-[var(--space-rail)]"
      >
        <Link
          href="/"
          className="flex h-[4.5rem] items-center gap-2.5 px-0 md:justify-center xl:justify-start xl:px-6"
          aria-label={`${brand}, home`}
        >
          <Monogram size={30} className="transition-transform duration-700 group-hover:rotate-[24deg]" />
          <span className="font-lux hidden text-[1.55rem] font-medium leading-none tracking-tight xl:block">{brand}</span>
        </Link>

        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-1 px-2.5 py-2 xl:px-3">
          {primary.map((item) => {
            const active = isActive(item.kind, path);
            const Icon = ICONS[item.icon];
            const count = badgeFor(item.kind, galleryUnseen, unread);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={count > 0 ? `${item.label}, ${count} new` : item.label}
                className={`group relative flex h-12 items-center gap-3 rounded-[var(--radius-control)] md:justify-center xl:justify-start xl:px-3 ${
                  active ? "bg-surface text-ink shadow-[var(--shadow-hairline)]" : "text-muted hover:bg-surface-2/70 hover:text-ink"
                } transition-colors`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2 : 1.65} />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.6rem] font-bold leading-4 text-accent-ink ring-2 ring-canvas">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  {item.kind === "together" && partnerInRoom && count === 0 && (
                    <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-success ring-2 ring-canvas" aria-label="Your partner is in the room" />
                  )}
                </span>
                <span className={`hidden whitespace-nowrap text-[0.92rem] xl:block ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                {active && <span className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-r-full bg-accent xl:block" aria-hidden />}
              </Link>
            );
          })}

          <div className="mt-3 border-t border-line/70 pt-3">
            <p className="hidden px-3 pb-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted xl:block">Our worlds</p>
            {worlds.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                aria-current={w.active ? "page" : undefined}
                className={`flex h-11 items-center gap-2.5 rounded-[var(--radius-control)] md:justify-center xl:justify-start xl:px-2 ${
                  w.active ? "bg-surface text-ink shadow-[var(--shadow-hairline)]" : "text-muted hover:bg-surface-2/70 hover:text-ink"
                } transition-colors`}
                aria-label={w.label}
              >
                <Avatar name={w.person.displayName} url={w.person.avatarUrl} theme={w.person.theme} size={26} />
                <span className="hidden truncate text-[0.86rem] font-medium xl:block">{w.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-3">
            <Link href="/story#add" className="btn mb-3 hidden w-full justify-center xl:flex">
              <IconPlus size={17} /> New memory
            </Link>
            <Link
              href="/story#add"
              aria-label="New memory"
              className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-accent text-accent-ink shadow-[var(--shadow-button)] transition hover:brightness-110 active:scale-95 xl:hidden"
            >
              <IconPlus size={19} />
            </Link>
            <div className="hidden xl:-mx-1 xl:mb-1 xl:block">
              <PresencePill />
            </div>
            <Link
              href="/search"
              aria-current={path.startsWith("/search") ? "page" : undefined}
              className="flex h-11 items-center gap-3 rounded-[var(--radius-control)] text-muted transition-colors hover:bg-surface-2/70 hover:text-ink md:justify-center xl:justify-start xl:px-3"
            >
              <IconSearch size={21} />
              <span className="hidden text-[0.9rem] font-medium xl:block">Search</span>
            </Link>
            <Link
              href="/together/chat"
              aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
              aria-current={onChat ? "page" : undefined}
              className={`relative flex h-11 items-center gap-3 rounded-[var(--radius-control)] transition-colors md:justify-center xl:justify-start xl:px-3 ${
                onChat ? "bg-surface text-ink shadow-[var(--shadow-hairline)]" : "text-muted hover:bg-surface-2/70 hover:text-ink"
              }`}
            >
              <span className="relative">
                <IconMessage size={21} />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.6rem] font-bold leading-4 text-accent-ink ring-2 ring-canvas">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              <span className="hidden text-[0.9rem] font-medium xl:block">Messages</span>
            </Link>
            <Link
              href="/settings"
              aria-current={path.startsWith("/settings") ? "page" : undefined}
              className={`mb-3 flex h-12 items-center gap-3 rounded-[var(--radius-control)] transition-colors md:justify-center xl:justify-start xl:px-2 ${
                path.startsWith("/settings") ? "bg-surface text-ink shadow-[var(--shadow-hairline)]" : "text-muted hover:bg-surface-2/70 hover:text-ink"
              }`}
              aria-label={`Settings for ${me.displayName}`}
            >
              <Avatar name={me.displayName} url={me.avatarUrl} theme={me.theme} size={28} />
              <span className="hidden min-w-0 flex-1 xl:block">
                <span className="block truncate text-[0.88rem] font-semibold leading-tight">{me.displayName}</span>
                <span className="flex items-center gap-1 text-[0.7rem] text-muted">
                  <IconSettings size={11} /> Settings
                </span>
              </span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* ── Mobile: a quiet top bar and a thumb-height bottom bar. ── */}
      <header className={`glass sticky top-0 z-30 border-b border-line/70 md:hidden ${onChat ? "hidden" : ""}`}>
        <div className="flex h-[3.5rem] items-center gap-2 px-3">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${brand}, home`}>
            <Monogram size={26} />
            <span className="font-lux text-[1.35rem] font-medium leading-none tracking-tight">{brand}</span>
          </Link>
          <div className="ml-auto flex items-center gap-0.5">
            <Link href="/search" aria-label="Search" className="icon-btn">
              <IconSearch size={20} />
            </Link>
            <Link href="/together/chat" aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className="icon-btn relative">
              <IconMessage size={20} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.58rem] font-bold leading-4 text-accent-ink">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <div className="hidden sm:block">
              <PresencePill />
            </div>
            <Link href="/settings" aria-label="Your settings" className="ml-0.5">
              <Avatar name={me.displayName} url={me.avatarUrl} theme={me.theme} size={32} />
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className={`glass fixed inset-x-0 bottom-0 z-40 border-t border-line/80 pb-[env(safe-area-inset-bottom)] md:hidden ${onChat ? "hidden" : ""}`}
      >
        <ul className="grid grid-cols-6 px-1">
          {primary.map((item) => {
            const active = isActive(item.kind, path);
            const Icon = ICONS[item.icon];
            const count = badgeFor(item.kind, galleryUnseen, unread);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={count > 0 ? `${item.label}, ${count} new` : item.label}
                  className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 pt-1 pb-1.5 text-[0.62rem] font-semibold tracking-[0.01em] transition-colors ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  <span className={`grid h-7 w-11 place-items-center rounded-full transition-colors ${active ? "bg-accent-soft text-accent" : ""}`}>
                    <Icon size={21} strokeWidth={active ? 2.05 : 1.65} />
                  </span>
                  <span className="max-w-full truncate px-0.5">{item.label.replace("Our story", "Story")}</span>
                  {count > 0 && (
                    <span className="absolute right-[18%] top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.56rem] font-bold leading-4 text-accent-ink ring-2 ring-bg">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  {item.kind === "together" && partnerInRoom && count === 0 && (
                    <span className="absolute right-[26%] top-2 size-1.5 rounded-full bg-success" aria-label="Your partner is in the room" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
