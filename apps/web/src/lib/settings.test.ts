import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { geminiSecret, seal, unseal } from "./settings";

describe("settings secrets", () => {
  it("seals a key so the stored value never contains it, and rejects tampering", () => {
    const sealed = seal({ apiKey: "AIza-not-in-the-database" });
    expect(sealed).not.toContain("AIza");
    expect(unseal<{ apiKey: string }>(sealed)).toEqual({ apiKey: "AIza-not-in-the-database" });

    const tampered = `${sealed.slice(0, -2)}${sealed.endsWith("AA") ? "BB" : "AA"}`;
    expect(unseal(tampered)).toBeNull();
  });

  it("namespaces research keys per couple, so one world cannot read another's", () => {
    expect(geminiSecret("c1")).not.toBe(geminiSecret("c2"));
    expect(geminiSecret("c1")).toContain("c1");
  });
});
