import { requireCtx } from "@/lib/context";
import { storageMode } from "@/lib/media/storage";
import { galleryStats } from "@/lib/media/queries";
import { GallerySummary } from "@/components/gallery/summary";
import { Uploader } from "@/components/gallery/uploader";
import { Container, PageHeader } from "@/components/ui/page-header";
import { planUsage } from "@/lib/entitlements/server";

export const metadata = { title: "Our Gallery" };

export default async function GalleryPage() {
  const ctx = await requireCtx();
  const mode = storageMode();
  const [plan, stats] = await Promise.all([planUsage(ctx.relationship.id), galleryStats(ctx)]);
  const names = ctx.members.map((m) => m.displayName.split(" ")[0]).join(" & ");
  return (
    <>
      {/* Warm the two hosts the shelves and previews use before the first card paints. */}
      <link rel="preconnect" href="https://i.ytimg.com" />
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <PageHeader world="us" eyebrow="Our gallery" title="Everything we share, in one place">
        Photos, videos and songs from {names}. Whatever one of you posts appears for the other straight away — react, comment, or press
        <strong> Play together</strong> to enjoy it at the same moment, wherever you both are.
      </PageHeader>
      <Container world="us">
        <div className="space-y-8">
          <GallerySummary initial={stats} />
          <Uploader
            enabled={mode !== "none"}
            disabledReason="Photo and video storage needs one switch in Vercel (Storage → Blob → Connect). Songs and videos from YouTube already work."
            storage={{ used: plan.usage.storageBytes, limit: plan.limits.storageBytes }}
          />
        </div>
      </Container>
    </>
  );
}
