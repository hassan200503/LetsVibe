import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "../db/schema";
import {
  applyFlagOverride,
  cleanOverrides,
  explainFlags,
  flagReader,
  overrideKey,
  parseAllowlist,
  parseFlagEnv,
  readOverrides,
  resolveFlag,
  resolveFlags,
} from "./core";
import { FLAGS, FLAG_KEYS } from "./registry";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

describe("flag resolution", () => {
  it("keeps every unfinished or legally-gated feature off by default", () => {
    expect(flagReader(resolveFlags({ coupleId: A })).enabled()).toEqual([]);
    for (const key of FLAG_KEYS) expect(FLAGS[key].default).toBe(false);
  });

  it("reads FEATURE_FLAGS for on and off", () => {
    const { value, invalid } = parseFlagEnv("paywall=on, screenShare=off");
    expect(value).toEqual({ paywall: true, screenShare: false });
    expect(invalid).toEqual([]);
    expect(resolveFlag("paywall", { coupleId: A, env: value })).toBe(true);
    expect(resolveFlag("screenShare", { coupleId: A, env: value })).toBe(false);
  });

  it("collects an entry it cannot read instead of applying it", () => {
    const { value, invalid } = parseFlagEnv("paywal=on,screenShare=maybe");
    expect(value).toEqual({});
    expect(invalid).toEqual(["paywal=on", "screenShare=maybe"]);
  });

  it("turns a flag on for one allowlisted couple only", () => {
    const { value } = parseAllowlist(`paywall:${A},${B};screenShare:${A}`);
    expect(value.paywall).toEqual([A, B]);
    expect(resolveFlag("paywall", { coupleId: A, allowlist: value })).toBe(true);
    expect(resolveFlag("paywall", { coupleId: "33333333-3333-3333-3333-333333333333", allowlist: value })).toBe(false);
    expect(resolveFlag("screenShare", { coupleId: B, allowlist: value })).toBe(false);
  });

  it("reports an allowlist entry with no couple behind it", () => {
    expect(parseAllowlist("paywall:").invalid).toEqual(["paywall:"]);
    expect(parseAllowlist("nonsense").invalid).toEqual(["nonsense"]);
  });

  it("lets an override beat the environment, but never the kill switch", () => {
    expect(resolveFlag("paywall", { coupleId: A, env: { paywall: true }, overrides: { paywall: false } })).toBe(false);
    expect(resolveFlag("paywall", { coupleId: A, env: { paywall: false }, overrides: { paywall: true } })).toBe(false);
    expect(resolveFlag("paywall", { coupleId: A, overrides: { paywall: true } })).toBe(true);
  });

  it("says where each answer came from", () => {
    const rows = explainFlags({
      coupleId: A,
      env: { screenShare: false, syncTransportV2: true },
      allowlist: { paywall: [A] },
      overrides: { licensedCatalogue: true },
    });
    const source = Object.fromEntries(rows.map((row) => [row.key, row.source]));
    expect(source.paywall).toBe("allowlist");
    expect(source.licensedCatalogue).toBe("override");
    expect(source.screenShare).toBe("kill-switch");
    expect(source.syncTransportV2).toBe("environment");
    expect(source.publicCommons).toBe("default");
  });

  it("ignores anything in a stored row that is not a known flag", () => {
    expect(cleanOverrides({ paywall: true, nope: true, screenShare: "yes" })).toEqual({ paywall: true });
    expect(cleanOverrides(null)).toEqual({});
  });
});

describe("flag overrides", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }, 60_000);

  beforeEach(async () => {
    await client.exec('TRUNCATE TABLE "kv" RESTART IDENTITY CASCADE');
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("records an override and appends it to the audit log", async () => {
    const next = await applyFlagOverride(db, { coupleId: A, key: "paywall", enabled: true, actor: "admin:cli", reason: "staging trial" });
    expect(next).toEqual({ paywall: true });
    expect(await readOverrides(db, A)).toEqual({ paywall: true });
    // A second couple is untouched: an override is never deployment-wide.
    expect(await readOverrides(db, B)).toEqual({});

    const [entry] = await db.select().from(schema.auditLog).where(eq(schema.auditLog.action, "flag.override"));
    expect(entry.targetId).toBe(A);
    expect(entry.detail).toMatchObject({ key: "paywall", reason: "staging trial", before: null, after: true });
  });

  it("returns a couple to the environment's answer when the override is cleared", async () => {
    await applyFlagOverride(db, { coupleId: A, key: "paywall", enabled: true, actor: "admin:cli" });
    const cleared = await applyFlagOverride(db, { coupleId: A, key: "paywall", enabled: null, actor: "admin:cli" });
    expect(cleared).toEqual({});
    expect(await readOverrides(db, A)).toEqual({});
    expect(resolveFlag("paywall", { coupleId: A, overrides: await readOverrides(db, A) })).toBe(false);
  });

  it("keeps one row per couple", async () => {
    await applyFlagOverride(db, { coupleId: A, key: "paywall", enabled: true, actor: "admin:cli" });
    await applyFlagOverride(db, { coupleId: A, key: "screenShare", enabled: true, actor: "admin:cli" });
    const rows = await db.select().from(schema.kv).where(eq(schema.kv.key, overrideKey(A)));
    expect(rows).toHaveLength(1);
  });
});
