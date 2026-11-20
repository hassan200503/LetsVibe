import { NextResponse } from "next/server";
import { getCtx } from "@/lib/context";
import { galleryStats } from "@/lib/media/queries";

/** GET /api/gallery/stats — counts for the shared-gallery summary. */
export async function GET() {
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const stats = await galleryStats(ctx);
  return NextResponse.json(stats, { headers: { "Cache-Control": "private, no-store" } });
}
