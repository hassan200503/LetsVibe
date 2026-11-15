import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { BRAND } from "./brand";

describe("brand", () => {
  it("uses the canonical public name and technical slug", () => {
    expect(BRAND.name).toBe("Let'sVibe");
    expect(BRAND.slug).toBe("letsvibe");
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
