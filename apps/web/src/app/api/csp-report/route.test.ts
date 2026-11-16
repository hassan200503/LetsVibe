import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const report = {
  "csp-report": {
    "document-uri": "https://app.example/join/secret-token",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://evil.example/path?token=secret",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CSP report endpoint", () => {
  it("accepts a browser report and logs only the sanitised summary", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify(report),
      }),
    );
    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("[csp]", JSON.stringify({ directive: "script-src-elem", blocked: "https://evil.example" }));
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret");
  });

  it("rejects other content types, invalid JSON and oversized reports", async () => {
    const post = (body: string, type = "application/csp-report") =>
      POST(new Request("http://localhost/api/csp-report", { method: "POST", headers: { "content-type": type }, body }));
    expect((await post("{}", "text/plain")).status).toBe(415);
    expect((await post("{")).status).toBe(400);
    expect((await post("x".repeat(8 * 1024 + 1))).status).toBe(413);
  });
});
