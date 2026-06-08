import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  invites,
  memberships,
  type Invite,
  type Workspace,
} from "@/lib/db/schema";
import type { Role } from "@/lib/auth/permissions";
import { getMembership, getWorkspaceById } from "@/lib/workspaces/queries";

/**
 * Pure data-access layer for workspace invites.
 *
 * Like lib/workspaces/queries, these functions do NOT perform auth checks —
 * callers gate access via lib/auth/guard. Email comparisons are always done on
 * the lowercased address so a `bob@x.com` invite matches a `Bob@X.com` login.
 */

// Invites live for 7 days from creation.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Roles an invite may grant. 'owner' is intentionally excluded (ownership
// transfer is out of scope); callers should also validate at the edge.
type InvitableRole = Exclude<Role, "owner">;

/**
 * Create a pending invite for `email` to join `workspaceId` as `role`.
 *
 * The token is a single-use nanoid(32) and the invite expires 7 days out. If a
 * pending invite already exists for the same (workspace, email) it is revoked
 * first so there is at most one live invite per address — the freshly created
 * row (with a new token) is what we return.
 */
export async function createInvite({
  workspaceId,
  email,
  role,
  invitedBy,
}: {
  workspaceId: string;
  email: string;
  role: InvitableRole;
  invitedBy: string;
}): Promise<Invite> {
  const normalizedEmail = email.toLowerCase();

  // Revoke any existing pending invite for this (workspace, email) pair so we
  // never accumulate duplicates.
  await db
    .update(invites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(invites.workspaceId, workspaceId),
        eq(invites.email, normalizedEmail),
        eq(invites.status, "pending"),
      ),
    );

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [invite] = await db
    .insert(invites)
    .values({
      workspaceId,
      email: normalizedEmail,
      role,
      token,
      invitedBy,
      status: "pending",
      expiresAt,
    })
    .returning();

  return invite;
}

/** Look up an invite by its single-use token, or null. */
export async function getInviteByToken(token: string): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);
  return row ?? null;
}

/** Pending invites for a workspace, most recent first. */
export async function listInvites(workspaceId: string): Promise<Invite[]> {
  return db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.workspaceId, workspaceId),
        eq(invites.status, "pending"),
      ),
    )
    .orderBy(desc(invites.createdAt));
}

/** Mark an invite as revoked (scoped to its workspace as a safety check). */
export async function revokeInvite(
  inviteId: string,
  workspaceId: string,
): Promise<void> {
  await db
    .update(invites)
    .set({ status: "revoked" })
    .where(
      and(eq(invites.id, inviteId), eq(invites.workspaceId, workspaceId)),
    );
}

// Discriminated result of an accept attempt.
export type AcceptResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; reason: string };

/**
 * Accept an invite on behalf of a logged-in user.
 *
 * Validation order:
 *  1. Invite must exist.
 *  2. Invite must be pending (already accepted / revoked → fail).
 *  3. Invite must not be past its expiry (else mark 'expired' and fail).
 *  4. Invite email must match the user's session email (case-insensitive).
 *
 * On success a membership is inserted at the invited role — unless the user is
 * already a member, in which case the existing membership is left untouched and
 * the invite is still marked accepted (idempotent). The invite is moved to
 * 'accepted' with accepted_at = now.
 */
export async function acceptInvite({
  token,
  userId,
  userEmail,
}: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptResult> {
  const invite = await getInviteByToken(token);
  if (!invite) {
    return { ok: false, reason: "This invite link is not valid." };
  }

  if (invite.status !== "pending") {
    return {
      ok: false,
      reason: `This invite has already been ${invite.status}.`,
    };
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    // Lazily flip expired invites so listings stay clean.
    await db
      .update(invites)
      .set({ status: "expired" })
      .where(eq(invites.id, invite.id));
    return { ok: false, reason: "This invite has expired." };
  }

  if (invite.email !== userEmail.toLowerCase()) {
    return {
      ok: false,
      reason: `This invite was sent to ${invite.email}. Sign in with that address to accept it.`,
    };
  }

  const workspace = await getWorkspaceById(invite.workspaceId);
  if (!workspace) {
    return { ok: false, reason: "The workspace no longer exists." };
  }

  // Insert a membership unless the user already belongs to the workspace, in
  // which case accepting is a no-op on memberships but still marks the invite.
  const existing = await getMembership(invite.workspaceId, userId);
  if (!existing) {
    await db.insert(memberships).values({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    });
  }

  await db
    .update(invites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(invites.id, invite.id));

  return { ok: true, workspace };
}
