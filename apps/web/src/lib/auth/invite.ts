import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { invitations } from "@/lib/db/schema";

type Db = Awaited<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type Invitation = { id: string; coupleId: string; expiresAt: Date };

/**
 * Issues a single-use invitation link. Only the hash is stored, so a database
 * leak cannot be used to join a couple; the raw link exists only in the reply.
 * Any older unaccepted link for this couple is revoked first.
 */
export async function createInvitation(db: Db, coupleId: string, createdBy: string, ttlMs = INVITE_TTL_MS): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ revokedAt: now })
      .where(and(eq(invitations.coupleId, coupleId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    await tx.insert(invitations).values({
      coupleId,
      tokenHash: hashToken(token),
      createdBy,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
  });
  return token;
}

export async function findInvitation(db: Db, token: string): Promise<Invitation | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ id: invitations.id, coupleId: invitations.coupleId, expiresAt: invitations.expiresAt })
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hashToken(token)),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Marks an invitation used. Returns false if another request already consumed it. */
export async function consumeInvitation(tx: Tx, invitationId: string, personId: string): Promise<boolean> {
  const now = new Date();
  const rows = await tx
    .update(invitations)
    .set({ acceptedBy: personId, acceptedAt: now })
    .where(and(eq(invitations.id, invitationId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, now)))
    .returning({ id: invitations.id });
  return rows.length === 1;
}

export async function revokeInvitations(db: Db, coupleId: string): Promise<void> {
  await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(invitations.coupleId, coupleId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
}
