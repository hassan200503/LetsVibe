import { describe, expect, it } from "vitest";
import { DISCOVER_CATEGORIES, SEARCH_QUERY_MAX, isDiscoverCategory, normalizeSearchQuery, parseIsoDuration, youtubeIdFrom, youtubeThumb } from "./youtube";

describe("youtubeIdFrom", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads %s", (input, id) => {
    expect(youtubeIdFrom(input)).toBe(id);
  });

  it("rejects anything that is not a video id", () => {
    expect(youtubeIdFrom("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeIdFrom("not a link")).toBeNull();
  });
});

describe("parseIsoDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT2M3S", 123],
    ["PT1H2M3S", 3723],
    ["P1DT1S", 86_401],
    ["PT1.6S", 2],
  ])("converts %s to %i seconds", (iso, sec) => {
    expect(parseIsoDuration(iso)).toBe(sec);
  });

  it("returns null for malformed durations", () => {
    expect(parseIsoDuration("1:02:03")).toBeNull();
    expect(parseIsoDuration("P")).toBeNull();
    expect(parseIsoDuration("")).toBeNull();
  });
});

describe("discover categories", () => {
  it("ships exactly the five shelves the gallery shows", () => {
    expect(Object.keys(DISCOVER_CATEGORIES)).toEqual(["movies", "music", "shorts", "animation", "news"]);
    for (const shelf of Object.values(DISCOVER_CATEGORIES)) {
      expect(shelf.query.length).toBeGreaterThan(0);
      expect(shelf.label.length).toBeGreaterThan(0);
    }
  });

  it("validates category input", () => {
    expect(isDiscoverCategory("music")).toBe(true);
    expect(isDiscoverCategory("podcasts")).toBe(false);
    expect(isDiscoverCategory(null)).toBe(false);
  });
});

describe("normalizeSearchQuery", () => {
  it("collapses whitespace so the same search shares one cache entry", () => {
    expect(normalizeSearchQuery("  Arijit   Singh  ")).toBe("Arijit Singh");
    expect(normalizeSearchQuery("full\nmovie")).toBe("full movie");
  });

  it("keeps accents and non-Latin titles", () => {
    expect(normalizeSearchQuery("Beyoncé — Halo")).toBe("Beyoncé — Halo");
    expect(normalizeSearchQuery("南印度 电影")).toBe("南印度 电影");
  });

  it("rejects empty, one-letter and oversized searches", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
    expect(normalizeSearchQuery("a")).toBeNull();
    expect(normalizeSearchQuery("x".repeat(SEARCH_QUERY_MAX + 1))).toBeNull();
    expect(normalizeSearchQuery(null)).toBeNull();
  });
});

describe("youtubeThumb", () => {
  it("uses the 16:9 mobile thumbnail that always exists", () => {
    expect(youtubeThumb("dQw4w9WgXcQ", "mq")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
    expect(youtubeThumb("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});
