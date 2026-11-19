import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 20 characters from a 32-symbol alphabet, grouped for transcription. Never stored raw. */
export function newRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(20);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return [out.slice(0, 5), out.slice(5, 10), out.slice(10, 15), out.slice(15, 20)].join("-");
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(`lovora/recovery-v1/${normalizeRecoveryCode(code)}`).digest("hex");
}

export function matchesRecovery(code: string, storedHash: string): boolean {
  const given = Buffer.from(hashRecoveryCode(code));
  const stored = Buffer.from(storedHash);
  return given.length === stored.length && timingSafeEqual(given, stored);
}
