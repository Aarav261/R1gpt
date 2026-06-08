import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import {
  guardError,
  requireCan,
  requireMembership,
} from "@/lib/auth/guard";
import { countOwners, getMembership } from "@/lib/workspaces/queries";
import type { Role } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string; userId: string } };

const patchSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

/**
 * PATCH — change a member's role. Requires manage_members (owner/admin).
 *
 * Guards:
 *  - Target must be an existing member (404 otherwise).
 *  - The last owner cannot be demoted (403).
 *  - Only an owner may grant the 'owner' role; admins can set up to admin (403).
 *  - Only an owner may change the role of an existing owner (403).
 */
export async function PATCH(request: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "manage_members");
  if (!result.ok) return guardError(result);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const newRole = parsed.data.role;
  const callerRole = result.membership.role as Role;

  const target = await getMembership(params.workspaceId, params.userId);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  const targetRole = target.role as Role;

  // Only an owner may grant the 'owner' role.
  if (newRole === "owner" && callerRole !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can grant the owner role." },
      { status: 403 },
    );
  }

  // Only an owner may modify an existing owner (e.g. demote them).
  if (targetRole === "owner" && callerRole !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can change an owner's role." },
      { status: 403 },
    );
  }

  // The last owner cannot be demoted away from owner.
  if (targetRole === "owner" && newRole !== "owner") {
    const owners = await countOwners(params.workspaceId);
    if (owners <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last owner of the workspace." },
        { status: 403 },
      );
    }
  }

  const [updated] = await db
    .update(memberships)
    .set({ role: newRole })
    .where(
      and(
        eq(memberships.workspaceId, params.workspaceId),
        eq(memberships.userId, params.userId),
      ),
    )
    .returning();

  return NextResponse.json({ membership: updated });
}

/**
 * DELETE — remove a member. A member may remove THEMSELVES (leave) regardless
 * of role; removing anyone else requires manage_members (owner/admin).
 *
 * Guards:
 *  - Target must be an existing member (404 otherwise).
 *  - The last owner can neither be removed nor leave (403).
 *  - Only an owner may remove another owner (403).
 */
export async function DELETE(_req: Request, { params }: Params) {
  // Authenticate + load caller membership; any member passes this gate.
  const result = await requireMembership(params.workspaceId, "viewer");
  if (!result.ok) return guardError(result);

  const callerRole = result.membership.role as Role;
  const isSelf = result.user.id === params.userId;

  const target = await getMembership(params.workspaceId, params.userId);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  const targetRole = target.role as Role;

  if (!isSelf) {
    // Removing someone else requires manage_members.
    const canManage = await requireCan(
      params.workspaceId,
      "manage_members",
    );
    if (!canManage.ok) return guardError(canManage);

    // Only an owner may remove another owner.
    if (targetRole === "owner" && callerRole !== "owner") {
      return NextResponse.json(
        { error: "Only an owner can remove an owner." },
        { status: 403 },
      );
    }
  }

  // The last owner can neither be removed nor leave.
  if (targetRole === "owner") {
    const owners = await countOwners(params.workspaceId);
    if (owners <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner of the workspace." },
        { status: 403 },
      );
    }
  }

  await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.workspaceId, params.workspaceId),
        eq(memberships.userId, params.userId),
      ),
    );

  return NextResponse.json({ ok: true });
}
