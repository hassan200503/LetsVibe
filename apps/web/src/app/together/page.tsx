import Link from "next/link";
import { requireCtx } from "@/lib/context";
import { readRoom, RoomUnavailableError, type RoomPayload } from "@/lib/together/room";
import { RoomClient } from "@/components/together/room-client";
import { TogetherTabs } from "@/components/together/tabs";
import { Container, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Together" };

export default async function TogetherRoomPage() {
  const ctx = await requireCtx();
  let initial: RoomPayload;
  try {
    initial = await readRoom(ctx, null, null);
  } catch (error) {
    if (!(error instanceof RoomUnavailableError)) throw error;
    return (
      <>
        <PageHeader world="us" eyebrow="Together" title="The room is resting">
          Your plan doesn&apos;t include the shared player right now. Everything else in your world is still here.
        </PageHeader>
        <Container world="us">
          <section className="card-glow p-6">
            <p className="font-display text-xl font-semibold">Shared listening and watching is paused</p>
            <p className="mt-2 text-sm text-muted">{error.message}</p>
            <Link href="/settings#plan" className="btn mt-5">
              See plan &amp; usage
            </Link>
          </section>
        </Container>
      </>
    );
  }
  const first = ctx.partners[0]?.displayName.split(" ")[0];
  return (
    <>
      <PageHeader world="us" eyebrow="Together" title="Wherever you are, in the same moment">
        Press play, pause or skip and it happens for both of you, second by second. Talk{first ? ` with ${first}` : ""} as you listen, or call when words aren&apos;t enough.
        <div className="mt-6">
          <TogetherTabs />
        </div>
      </PageHeader>
      <Container world="us">
        <RoomClient initial={initial} />
      </Container>
    </>
  );
}
