import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  can,
  hasAtLeast,
  type Action,
  type Role,
  type StakeholderType,
} from "@/lib/auth/permissions";
import {
  getMembership,
  getWorkspaceById,
  getWorkspaceBySlug,
} from "@/lib/workspaces/queries";
import { getProjectBySlug } from "@/lib/projects/queries";
import type { Membership, Project, Workspace } from "@/lib/db/schema";

/**
 * RBAC choke point. Every workspace-scoped route handler and protected page
 * funnels through here so authorization lives in exactly one place.
 *
 * The API is result-style (it never throws): handlers branch on `result.ok`
 * and call `guardError(result)` on failure, keeping the happy path flat.
 */

// Minimal authenticated-user shape exposed to callers on success.
export type GuardUser = { id: string; email: string; name?: string };

export type GuardResult =
  | {
      ok: true;
      user: GuardUser;
      workspace: Workspace;
      membership: Membership;
    }
  | {
      ok: false;
      status: 401 | 403 | 404;
      message: string;
    };

// Shared resolution: authenticate, load workspace via `loader`, load membership.
// Returns a partial result that the public guards finish by checking the role.
async function resolve(
  loader: () => Promise<Workspace | null>,
): Promise<
  | { ok: false; status: 401 | 403 | 404; message: string }
  | { ok: true; user: GuardUser; workspace: Workspace; membership: Membership }
> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id || !sessionUser.email) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  const workspace = await loader();
  if (!workspace) {
    return { ok: false, status: 404, message: "Workspace not found." };
  }

  const membership = await getMembership(workspace.id, sessionUser.id);
  if (!membership) {
    return {
      ok: false,
      status: 403,
      message: "You are not a member of this workspace.",
    };
  }

  return {
    ok: true,
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name ?? undefined,
    },
    workspace,
    membership,
  };
}

/**
 * Require that the current user is a member of `workspaceId` with at least
 * `minRole`. Resolution order: 401 (no session) → 404 (no workspace) →
 * 403 (not a member / insufficient role).
 */
export async function requireMembership(
  workspaceId: string,
  minRole: Role = "viewer",
): Promise<GuardResult> {
  const result = await resolve(() => getWorkspaceById(workspaceId));
  if (!result.ok) return result;

  if (!hasAtLeast(result.membership.role as Role, minRole)) {
    return {
      ok: false,
      status: 403,
      message: `Requires ${minRole} role or higher.`,
    };
  }
  return result;
}

/**
 * Require that the current user is a member of `workspaceId` permitted to
 * perform `action` (per the can() matrix). Same resolution order as above.
 */
export async function requireCan(
  workspaceId: string,
  action: Action,
): Promise<GuardResult> {
  const result = await resolve(() => getWorkspaceById(workspaceId));
  if (!result.ok) return result;

  if (!can(result.membership.role as Role, action)) {
    return {
      ok: false,
      status: 403,
      message: `You do not have permission to ${action.replace(/_/g, " ")}.`,
    };
  }
  return result;
}

/**
 * Server-component variant: resolve the workspace by slug instead of id.
 * Same GuardResult shape so pages can branch identically (e.g. notFound() on
 * 404, redirect on 401).
 */
export async function requireMembershipBySlug(
  slug: string,
  minRole: Role = "viewer",
): Promise<GuardResult> {
  const result = await resolve(() => getWorkspaceBySlug(slug));
  if (!result.ok) return result;

  if (!hasAtLeast(result.membership.role as Role, minRole)) {
    return {
      ok: false,
      status: 403,
      message: `Requires ${minRole} role or higher.`,
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Project-scoped access.
//
// Access to a project is granted to (a) any team member of the parent workspace
// — full access, `consultant` lens — or (b) an external guest with a
// project_members row (added in Phase 4) — scoped `viewer` access with a fixed
// stakeholder lens. This phase implements the team path; the guest branch slots
// in where noted.
// ---------------------------------------------------------------------------
export type ProjectGuardResult =
  | {
      ok: true;
      user: GuardUser;
      workspace: Workspace;
      project: Project;
      access: "team" | "guest";
      role: Role;
      stakeholderType: StakeholderType;
    }
  | { ok: false; status: 401 | 403 | 404; message: string };

/**
 * Resolve project access by (workspaceSlug, projectSlug). Authenticates, loads
 * the workspace + project, then checks team membership (full access). Guests
 * are handled in Phase 4. Optional `minRole` further gates team members.
 */
export async function requireProjectAccess(
  workspaceSlug: string,
  projectSlug: string,
  minRole: Role = "viewer",
): Promise<ProjectGuardResult> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id || !sessionUser.email) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    return { ok: false, status: 404, message: "Workspace not found." };
  }

  const project = await getProjectBySlug(workspace.id, projectSlug);
  if (!project) {
    return { ok: false, status: 404, message: "Project not found." };
  }

  const user: GuardUser = {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name ?? undefined,
  };

  // Team path: a workspace membership grants full project access.
  const membership = await getMembership(workspace.id, sessionUser.id);
  if (membership) {
    if (!hasAtLeast(membership.role as Role, minRole)) {
      return {
        ok: false,
        status: 403,
        message: `Requires ${minRole} role or higher.`,
      };
    }
    return {
      ok: true,
      user,
      workspace,
      project,
      access: "team",
      role: membership.role as Role,
      stakeholderType: "consultant",
    };
  }

  // Guest path (Phase 4): look up a project_members row here. Until then, a
  // non-member has no access.
  return {
    ok: false,
    status: 403,
    message: "You do not have access to this project.",
  };
}

/**
 * Convert a failed GuardResult into a JSON error response. Narrowing keeps the
 * success branch out: callers only pass results where `ok === false`.
 */
export function guardError(
  result:
    | Extract<GuardResult, { ok: false }>
    | Extract<ProjectGuardResult, { ok: false }>,
): NextResponse {
  return NextResponse.json(
    { error: result.message },
    { status: result.status },
  );
}
