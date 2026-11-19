"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { createSession, destroySession } from "@/lib/auth/session";
import { authenticate, normalizeEmail, recoverAccount } from "@/lib/auth/accounts";
import type { ActionState } from "./util";

function clientIp(requestHeaders: Headers): string {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "local";
}

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const password = String(fd.get("password") ?? "");
  const next = safeNext(String(fd.get("next") ?? "/"));
  if (!email || !password) return { error: "Enter your email and password." };

  const db = await getDb();
  const result = await authenticate(db, { email, password, ip: clientIp(await headers()) });
  if (!result.ok) return { error: result.error };

  await createSession({ personId: result.personId, slug: result.slug, version: result.sessionVersion });
  revalidatePath("/", "layout");
  redirect(next);
}

/** Recovers an account with the one-time code issued at signup, then issues a new code. */
export async function recoverPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "");
  const code = String(fd.get("code") ?? "");
  const next = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!email || !code) return { error: "Enter your email and recovery code." };
  if (next !== confirm) return { error: "The passwords do not match." };

  const db = await getDb();
  const result = await recoverAccount(db, { email, code, newPassword: next, ip: clientIp(await headers()) });
  if (!result.ok) return { error: result.error };

  await createSession({ personId: result.personId, slug: result.slug, version: result.sessionVersion });
  revalidatePath("/", "layout");
  return { ok: true, recoveryCode: result.recoveryCode };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
