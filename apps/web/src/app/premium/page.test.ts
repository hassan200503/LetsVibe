import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  flagFor: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/context", () => ({
  requireCtx: async () => ({ relationship: { id: "c1" }, me: { theme: "us" } }),
}));
vi.mock("@/lib/flags/server", () => ({ flagFor: mocks.flagFor }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/entitlements/server", () => ({
  planUsage: async () => ({
    plan: "free",
    limits: { storageBytes: 1024 * 1024 * 1024, aiQuestionsPerMonth: 100, rooms: 1, exportsPerMonth: 3 },
    usage: { storageBytes: 0, aiQuestions: 0, aiTokens: 0, aiCostMicros: 0, rooms: 0, exports: 0 },
    resetsAt: "2026-12-01T00:00:00.000Z",
  }),
}));

import PremiumPage from "./page";

describe("premium page", () => {
  beforeEach(() => {
    mocks.flagFor.mockReset();
    mocks.notFound.mockClear();
  });

  it("does not exist for a couple whose paywall flag is off", async () => {
    mocks.flagFor.mockResolvedValue(false);
    await expect(PremiumPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.flagFor).toHaveBeenCalledWith("c1", "paywall");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("renders entitlement limits and a disabled purchase path when the flag is on", async () => {
    mocks.flagFor.mockResolvedValue(true);
    const html = renderToStaticMarkup(await PremiumPage());
    expect(html).toContain("Billing isn&#x27;t open yet");
    expect(html).toContain("Coming soon");
    expect(html).toContain("disabled");
    expect(html).toContain("Shared storage");
    expect(html).toContain("1 GB");
    expect(html).toContain("25 GB");
    expect(html).not.toMatch(/\$\s?\d/);
  });
});
