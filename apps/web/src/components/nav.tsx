import { getCtx } from "@/lib/context";
import { BRAND } from "@lovora/domain";
import { AppChrome, type ChromeMember, type PrimaryNav } from "./shell/app-chrome";

export async function Nav() {
  const ctx = await getCtx();
  if (!ctx) return null;
  const primary: PrimaryNav[] = [
    { href: "/", label: "Home", icon: "home", kind: "home" },
    { href: "/story", label: "Our story", icon: "story", kind: "story" },
    { href: "/gallery", label: "Gallery", icon: "gallery", kind: "gallery", badge: "gallery" },
    { href: "/together", label: "Together", icon: "together", kind: "together", badge: "messages" },
    { href: "/discover", label: "Discover", icon: "discover", kind: "discover" },
    { href: "/research", label: "Research", icon: "research", kind: "research" },
  ];
  const members: ChromeMember[] = ctx.members.map((m) => ({
    id: m.id,
    slug: m.slug,
    displayName: m.displayName,
    theme: m.theme,
    avatarUrl: m.avatarUrl,
  }));
  return <AppChrome brand={BRAND.name} me={members.find((m) => m.id === ctx.me.id) ?? members[0]} members={members} primary={primary} />;
}
