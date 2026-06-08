import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  memberships,
  projects,
  users,
  workspaces,
  type Membership,
  type Project,
  type Workspace,
} from "@/lib/db/schema";
import type { Role } from "@/lib/auth/permissions";

/**
 * Pure data-access layer for workspaces & memberships.
 *
 * These functions do NOT perform auth checks — callers (route handlers, server
 * components) gate access via lib/auth/guard. Keeping them auth-free makes them
 * reusable from trusted server contexts (e.g. signup bootstrap, jobs).
 */

/** Turn a name into a url-safe slug fragment. Empty → "workspace". */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "workspace";
}

/**
 * Create a workspace with an owner membership for `userId`, plus a seed
 * "first project" so the workspace always has at least one project (the project
 * list is never empty and onboarding uploads have a home).
 *
 * The slug is `slugify(name)-<nanoid(6)>` so concurrent workspaces with the
 * same name don't collide on the unique slug constraint.
 *
 * Neon's neon-http driver has limited transaction support: we attempt a
 * transaction first and fall back to sequential inserts if the driver rejects
 * it (mirrors app/api/auth/signup/route.ts).
 */
export async function createWorkspace({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<{ workspace: Workspace; project: Project }> {
  const slug = `${slugify(name)}-${nanoid(6).toLowerCase()}`;
  const projectName = `${name} — Project 1`;
  const projectSlug = `${slugify(name)}-1-${nanoid(6).toLowerCase()}`;

  try {
    return await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name, slug, createdBy: userId })
        .returning();

      await tx.insert(memberships).values({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      });

      const [project] = await tx
        .insert(projects)
        .values({
          workspaceId: workspace.id,
          createdBy: userId,
          name: projectName,
          slug: projectSlug,
        })
        .returning();

      return { workspace, project };
    });
  } catch {
    // Fallback: neon-http may not support transactions — insert sequentially.
    const [workspace] = await db
      .insert(workspaces)
      .values({ name, slug, createdBy: userId })
      .returning();

    await db.insert(memberships).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    const [project] = await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        createdBy: userId,
        name: projectName,
        slug: projectSlug,
      })
      .returning();

    return { workspace, project };
  }
}

/** All workspaces `userId` belongs to, each annotated with the caller's role. */
export async function listWorkspacesForUser(
  userId: string,
): Promise<Array<Workspace & { role: Role }>> {
  const rows = await db
    .select({
      workspace: workspaces,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId));

  return rows.map((r) => ({ ...r.workspace, role: r.role as Role }));
}

/** Look up a workspace by its unique slug (for pages). */
export async function getWorkspaceBySlug(
  slug: string,
): Promise<Workspace | null> {
  const [row] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Look up a workspace by id (for API routes). */
export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const [row] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);
  return row ?? null;
}

/** The membership row linking `userId` to `workspaceId`, or null. */
export async function getMembership(
  workspaceId: string,
  userId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Shape returned by listMembers — a member joined with their user profile.
export type MemberRow = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  joinedAt: Date;
};

/** All members of a workspace, joined with their user profile. */
export async function listMembers(
  workspaceId: string,
): Promise<MemberRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.workspaceId, workspaceId));

  return rows.map((r) => ({ ...r, role: r.role as Role }));
}

/** Number of owners in a workspace (for last-owner guards). */
export async function countOwners(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.role, "owner"),
      ),
    );
  return row?.count ?? 0;
}
