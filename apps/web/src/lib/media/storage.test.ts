import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * The blob client is the only thing that can turn a path into a signed URL, so
 * it is mocked to record what it was asked to sign. Nothing here reaches the
 * network, and no real credential is needed.
 */
const blob = vi.hoisted(() => ({ signed: [] as string[] }));

vi.mock("@vercel/blob", () => ({
  issueSignedToken: async () => ({ delegationToken: "delegation", clientSigningToken: "client", validUntil: Date.now() + 12 * 3_600_000 }),
  presignUrl: async (_d: unknown, opts: { pathname: string }) => {
    blob.signed.push(opts.pathname);
    return { presignedUrl: `https://blob.example/${opts.pathname}?sig=opaque` };
  },
}));

// The shared delegation is kept in the database in production; in this test the
// database is not the subject, so the module falls back to a direct token.
vi.mock("@/lib/db/client", () => ({ getDb: async () => { throw new Error("no database in this test"); } }));

import { newPath, ownsPath, storageMode, viewUrl } from "./storage";

const OURS = "10000000-0000-4000-8000-00000000000a";
const THEIRS = "10000000-0000-4000-8000-00000000000b";

const saved = { BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN, BLOB_STORE_ID: process.env.BLOB_STORE_ID, VERCEL: process.env.VERCEL };

beforeEach(() => {
  blob.signed.length = 0;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("ownsPath", () => {
  it("accepts a path inside the couple's own folder", () => {
    expect(ownsPath(OURS, `rel/${OURS}/photo/${"a".repeat(8)}.webp`)).toBe(true);
    expect(ownsPath(OURS, `rel/${OURS}/video/clip.mp4`)).toBe(true);
    expect(ownsPath(OURS, `rel/${OURS}/avatar/me.jpg`)).toBe(true);
  });

  it("refuses every path that starts in another couple's folder", () => {
    expect(ownsPath(OURS, `rel/${THEIRS}/photo/a.webp`)).toBe(false);
    expect(ownsPath(OURS, `rel/${THEIRS}/../${THEIRS}/photo/a.webp`)).toBe(false);
    // A prefix that merely begins with the id is not the folder.
    expect(ownsPath(OURS, `rel/${OURS}x/photo/a.webp`)).toBe(false);
    expect(ownsPath(OURS, `rel/${OURS}`)).toBe(false);
    expect(ownsPath(OURS, `rel/${OURS}/`)).toBe(true);
  });

  it("refuses traversal, absolute paths and anything unprintable", () => {
    expect(ownsPath(OURS, `rel/${OURS}/photo/../../${THEIRS}/photo/a.webp`)).toBe(false);
    expect(ownsPath(OURS, "rel/../../etc/passwd")).toBe(false);
    expect(ownsPath(OURS, `/etc/passwd`)).toBe(false);
    expect(ownsPath(OURS, `rel\\${OURS}\\photo\\a.webp`)).toBe(false);
    expect(ownsPath(OURS, `rel/${OURS}/photo/a b.webp`)).toBe(false);
    expect(ownsPath(OURS, `rel/${OURS}/photo/a.webp%00`)).toBe(false);
  });

  it("refuses an empty or missing path", () => {
    expect(ownsPath(OURS, "")).toBe(false);
    expect(ownsPath(OURS, null)).toBe(false);
    expect(ownsPath(OURS, undefined)).toBe(false);
  });
});

describe("newPath", () => {
  it("always writes inside the couple's folder, whatever the file is", () => {
    for (const mime of ["image/webp", "video/mp4", "audio/mpeg", "application/zip"]) {
      const p = newPath(OURS, "photo", mime);
      expect(ownsPath(OURS, p)).toBe(true);
      expect(ownsPath(THEIRS, p)).toBe(false);
    }
  });

  it("names files so one cannot be guessed from another", () => {
    const first = newPath(OURS, "photo", "image/webp");
    const second = newPath(OURS, "photo", "image/webp");
    expect(first).toMatch(new RegExp(`^rel/${OURS}/photo/[0-9a-f-]{36}\\.webp$`));
    expect(first).not.toBe(second);
  });
});

describe("storageMode", () => {
  it("is local while developing and blob when a store is configured", () => {
    expect(storageMode()).toBe("local");
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    expect(storageMode()).toBe("blob");
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = "store";
    expect(storageMode()).toBe("blob");
    delete process.env.BLOB_STORE_ID;
    process.env.VERCEL = "1";
    expect(storageMode()).toBe("none");
  });
});

describe("viewUrl", () => {
  it("serves the file through our own route while developing", async () => {
    const p = newPath(OURS, "photo", "image/webp");
    expect(await viewUrl(p)).toBe(`/api/media/file/${p}`);
    expect(blob.signed).toEqual([]);
  });

  it("signs exactly one path, so a signature cannot be widened", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    const p = newPath(OURS, "photo", "image/webp");
    const url = await viewUrl(p);

    expect(blob.signed).toEqual([p]);
    expect(url).toContain(p);
    expect(url).not.toContain(THEIRS);
  });

  it("is path-bound: a second file gets its own signature, never the first one", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    const ours = newPath(OURS, "photo", "image/webp");
    const theirs = newPath(THEIRS, "photo", "image/webp");
    const [a, b] = [await viewUrl(ours), await viewUrl(theirs)];

    // Signing itself is not a permission check — it signs what it is handed.
    // Ownership is decided by the callers, which only ever pass rows they read
    // with the couple's own tenant (see media/queries.ts and ctxFor).
    expect(blob.signed).toEqual([ours, theirs]);
    expect(a).not.toBe(b);
    expect(a).not.toContain(THEIRS);
    expect(b).not.toContain(OURS);
  });
});
