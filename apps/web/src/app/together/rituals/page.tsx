import { requireCtx } from "@/lib/context";
import { readRituals } from "@/lib/rituals/queries";
import { RitualBoard } from "@/components/rituals/board";
import { TogetherTabs } from "@/components/together/tabs";
import { Container, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Rituals" };

export default async function RitualsPage() {
  const ctx = await requireCtx();
  const data = await readRituals(ctx, new Date());
  const partner = ctx.partner?.displayName.split(" ")[0];
  return (
    <>
      <PageHeader world="us" eyebrow="Together" title="The small things, on repeat">
        A rhythm you keep together — a line before the day starts, ten seconds of your voice, one photo of
        something you saw. Either of you keeps it, and it counts for both{partner ? `, so ${partner} never has to chase you` : ""}.
        <div className="mt-6">
          <TogetherTabs />
        </div>
      </PageHeader>
      <Container world="us">
        <RitualBoard data={data} />
      </Container>
    </>
  );
}
