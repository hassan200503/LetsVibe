import { summarizeCspReport } from "@/lib/security/headers";

export const runtime = "nodejs";

const MAX_BODY = 8 * 1024;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/csp-report") && !type.includes("application/reports+json")) {
    return new Response(null, { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = summarizeCspReport(parsed);
  if (report) console.warn("[csp]", JSON.stringify(report));
  return new Response(null, { status: 204 });
}
