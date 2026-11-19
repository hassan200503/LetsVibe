import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** The signed-in couple, swapped per test. `null` means nobody is signed in. */
const auth = vi.hoisted(() => ({ coupleId: null as string | null }));
vi.mock("@/lib/context", () => ({ getCtx: async () => (auth.coupleId ? { relationship: { id: auth.coupleId } } : null) }));

import { GET } from "./route";
import { LOCAL_ROOT } from "@/lib/media/storage";

/**
 * E2-003, at the edge. Two couples each have a real file on disk, and the
 * request that serves it carries only the session. A URL that names another
 * couple's object is refused because the file is not theirs — not because it is
 * missing — so the other couple is asked for the same file at the end and gets
 * it.
 */

const OURS = "10000000-0000-4000-8000-00000000000a";
const THEIRS = "10000000-0000-4000-8000-00000000000b";

const ours = `rel/${OURS}/photo/ours.webp`;
const theirs = `rel/${THEIRS}/photo/theirs.webp`;

function request(relative: string) {
  const params = { params: Promise.resolve({ path: relative.split("/") }) } satisfies RouteContext<"/api/media/file/[...path]">;
  return GET(new NextRequest(`http://localhost/api/media/file/${relative}`), params);
}

beforeAll(async () => {
  for (const [relative, body] of [
    [ours, "OURS"],
    [theirs, "THEIRS"],
  ] as const) {
    const file = path.join(LOCAL_ROOT, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
});

afterAll(async () => {
  auth.coupleId = null;
  // Only the two synthetic folders this test made, never the whole media store.
  await rm(path.join(LOCAL_ROOT, "rel", OURS), { recursive: true, force: true });
  await rm(path.join(LOCAL_ROOT, "rel", THEIRS), { recursive: true, force: true });
});

describe("GET /api/media/file", () => {
  it("serves a file that belongs to the signed-in couple", async () => {
    auth.coupleId = OURS;
    const response = await request(ours);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(await response.text()).toBe("OURS");
  });

  it("refuses another couple's file even though it is on disk", async () => {
    auth.coupleId = OURS;
    expect((await request(theirs)).status).toBe(404);
  });

  it("refuses a path that climbs out of the couple's folder", async () => {
    auth.coupleId = OURS;
    expect((await request(`rel/${OURS}/photo/../../${THEIRS}/photo/theirs.webp`)).status).toBe(404);
    expect((await request(`rel/${OURS}/photo/../../../etc/passwd`)).status).toBe(404);
  });

  it("refuses a path that is not under rel/ at all", async () => {
    auth.coupleId = OURS;
    expect((await request("../../package.json")).status).toBe(404);
    expect((await request("rel/photo/ours.webp")).status).toBe(404);
  });

  it("proves the refusal was ownership, not absence", async () => {
    auth.coupleId = THEIRS;
    const response = await request(theirs);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("THEIRS");

    // …and still nothing for the other couple.
    auth.coupleId = OURS;
    expect((await request(theirs)).status).toBe(404);
  });

  it("asks a signed-out visitor to sign in", async () => {
    auth.coupleId = null;
    expect((await request(ours)).status).toBe(401);
  });
});
