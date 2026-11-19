import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { storageMode } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Reports only non-sensitive facts: whether the
 * database answered, which media backend is configured and the deployed
 * revision. No rows, hosts, keys or error text leave the server.
 */
export async function GET() {
  const started = Date.now();
  let database = "down";
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    database = "up";
  } catch {
    database = "down";
  }

  const healthy = database === "up";
  const body = {
    status: healthy ? "ok" : "degraded",
    database,
    storage: storageMode(),
    revision: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "dev").slice(0, 12),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
  };

  return Response.json(body, {
    status: healthy ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
