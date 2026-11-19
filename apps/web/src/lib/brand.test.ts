import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { BRAND } from "@lovora/domain";

describe("brand", () => {
  it("uses the canonical public name and technical slug", () => {
    expect(BRAND.name).toBe("Lovora");
    expect(BRAND.slug).toBe("lovora");
    expect(BRAND.name).not.toContain("Universe");
  });

  it("installs with the same name as the site", () => {
    const app = manifest();
    expect(app.name).toBe(BRAND.name);
    expect(app.short_name).toBe(BRAND.name);
    expect(app.description).toBe(BRAND.description);
  });

  it("names new shared spaces without the old brand", () => {
    expect(BRAND.defaultSpaceName).toBe("Our World");
    expect(BRAND.defaultSpaceName.toLowerCase()).not.toContain("universe");
  });
});
