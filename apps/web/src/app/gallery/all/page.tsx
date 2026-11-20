import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { galleryPage } from "@/lib/media/queries";
import { isDiscoverCategory } from "@/lib/media/youtube";
import { GalleryGrid } from "@/components/gallery/grid";
import { Container, PageHeader } from "@/components/ui/page-header";
import { IconPlus } from "@/components/icons";

export const metadata = { title: "Shared gallery" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

export default async function AllGalleryPage({ searchParams }: PageProps<"/gallery/all">) {
  const ctx = await requireCtx();
  const params = await searchParams;
  const rawKind = one(params.kind);
  const rawCollection = one(params.collection);
  const rawSource = one(params.source);
  const kind = rawKind && ["photo", "video", "song"].includes(rawKind) ? rawKind : null;
  const collection = isDiscoverCategory(rawCollection) ? rawCollection : null;
  const source = rawSource === "youtube" || rawSource === "upload" ? rawSource : null;

  // Server-rendered first page: the grid paints with content, not a spinner.
  const initial = await galleryPage(ctx, { kind, collection, source, limit: 24 });
  const names = ctx.members.map((m) => m.displayName.split(" ")[0]).join(" & ");

  return (
    <>
      <PageHeader
        world="us"
        eyebrow="Our gallery"
        title="Every memory, all together"
        actions={
          <Link href="/gallery" className="btn btn-ghost">
            <IconPlus size={16} /> Add something
          </Link>
        }
      >
        Everything {names} have shared — photos, videos and songs from your devices, plus films and music from YouTube. Newest first.
      </PageHeader>
      <Container world="us">
        <GalleryGrid
          key={`${kind ?? "all"}-${collection ?? "any"}-${source ?? "any"}`}
          initialKind={kind}
          initialCollection={collection}
          initialSource={source}
          initialPage={initial}
          showHeading={false}
        />
      </Container>
    </>
  );
}
