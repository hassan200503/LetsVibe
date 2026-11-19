import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { MeProvider } from "@/components/me-context";
import { PulseProvider } from "@/components/pulse";
import { CallProvider } from "@/components/call/call-provider";
import { RoomProvider } from "@/components/together/room-provider";
import { ReachPrompt, ServiceWorker } from "@/components/push";
import { getCtx } from "@/lib/context";
import { BRAND } from "@lovora/domain";
import { baseDark, baseLight } from "@lovora/ui-tokens";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: baseLight.bg },
    { media: "(prefers-color-scheme: dark)", color: baseDark.bg },
  ],
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ctx = await getCtx();
  const pick = (p: NonNullable<typeof ctx>["me"]) => ({ id: p.id, slug: p.slug, displayName: p.displayName, theme: p.theme, avatarUrl: p.avatarUrl });
  const me = ctx ? pick(ctx.me) : null;
  const members = ctx ? ctx.members.map(pick) : [];
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${cormorant.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <MeProvider me={me} members={members}>
            {ctx ? (
              <PulseProvider>
                <CallProvider>
                  <RoomProvider>
                    <Nav />
                    <main className="flex-1 pb-28 sm:pb-0">{children}</main>
                    <ServiceWorker />
                    {ctx.partner && <ReachPrompt partnerName={ctx.partner.displayName.split(" ")[0]} />}
                  </RoomProvider>
                </CallProvider>
              </PulseProvider>
            ) : (
              <main className="flex-1">{children}</main>
            )}
          </MeProvider>
        </Providers>
      </body>
    </html>
  );
}
