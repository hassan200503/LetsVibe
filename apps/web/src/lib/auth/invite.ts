import "server-only";
import { sign, verifySignature } from "./session";

const MAX_AGE = 24 * 60 * 60 * 1000;

/** A shareable, expiring link to join one relationship. It stops working once the pair is full. */
export function inviteToken(coupleId: string): string {
  const payload = Buffer.from(JSON.stringify({ r: coupleId, e: Date.now() + MAX_AGE })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readInvite(token: string): { coupleId: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { r?: unknown; e?: unknown };
    if (typeof value.r !== "string" || typeof value.e !== "number" || value.e < Date.now()) return null;
    return { coupleId: value.r };
  } catch {
    return null;
  }
}
