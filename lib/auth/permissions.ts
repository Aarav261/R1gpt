/**
 * Role-based access control primitives.
 *
 * This module is pure (no db, no session) so it is safe to import from edge,
 * server components, route handlers, and tests alike. The role hierarchy and
 * the `can()` matrix are the single source of truth consumed by lib/auth/guard.
 */

// Workspace roles, ordered most → least privileged. Mirrors roleEnum in schema.
export type Role = "owner" | "admin" | "member" | "viewer";

// Numeric rank so we can express "at least this role" comparisons.
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** True when `role` is at least as privileged as `min`. */
export function hasAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

// Discrete capabilities a caller may attempt within a workspace.
export type Action =
  | "view"
  | "upload"
  | "invite"
  | "manage_members"
  | "manage_workspace";

// Capability matrix: which roles may perform each action.
const ACTION_MATRIX: Record<Action, Record<Role, boolean>> = {
  // Everyone who is a member of the workspace can view it.
  view: { owner: true, admin: true, member: true, viewer: true },
  // Viewers are read-only; everyone else can upload.
  upload: { owner: true, admin: true, member: true, viewer: false },
  // Inviting new people is an admin+ concern.
  invite: { owner: true, admin: true, member: false, viewer: false },
  // Changing/removing members is an admin+ concern.
  manage_members: { owner: true, admin: true, member: false, viewer: false },
  // Renaming/deleting the workspace itself is owner-only.
  manage_workspace: {
    owner: true,
    admin: false,
    member: false,
    viewer: false,
  },
};

/** True when `role` is permitted to perform `action`. */
export function can(role: Role, action: Action): boolean {
  return ACTION_MATRIX[action][role];
}

// Human-readable labels for UI (selects, badges, etc.).
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// ---------------------------------------------------------------------------
// Stakeholder visibility — orthogonal to the privilege ladder above.
//
// A `Role` answers "what can you DO" (upload, invite, manage). A
// `StakeholderType` answers "what can you SEE": it drives content visibility so
// an external OEM/NSP/AEMO guest sees a genuinely filtered project. Team members
// are always the `consultant` lens (full access). Kept here, pure, so both the
// guest's real (server-enforced) view and an owner's "Preview as" reuse it.
// ---------------------------------------------------------------------------
export type StakeholderType =
  | "consultant"
  | "proponent"
  | "oem"
  | "nsp"
  | "aemo";

export const STAKEHOLDER_TYPES: StakeholderType[] = [
  "consultant",
  "proponent",
  "oem",
  "nsp",
  "aemo",
];

export type StakeholderView = {
  label: string;
  access: string;
  /** Which documents this stakeholder may see. */
  docs: "all" | "summary" | "models";
  /** Which issues/RFIs this stakeholder may see. */
  issues: "full" | "summary" | "model-only";
  /** Whether this stakeholder may draft AI responses to issues. */
  canDraft: boolean;
};

export const STAKEHOLDER_VIEWS: Record<StakeholderType, StakeholderView> = {
  consultant: {
    label: "Power Systems Consultant",
    access: "full technical access",
    docs: "all",
    issues: "full",
    canDraft: true,
  },
  proponent: {
    label: "Proponent / Developer",
    access: "business summary — no model internals",
    docs: "summary",
    issues: "summary",
    canDraft: false,
  },
  oem: {
    label: "OEM (Sungrow)",
    access: "model files & test reports only",
    docs: "models",
    issues: "model-only",
    canDraft: false,
  },
  nsp: {
    label: "NSP (Transgrid)",
    access: "review — local network impact",
    docs: "all",
    issues: "full",
    canDraft: false,
  },
  aemo: {
    label: "AEMO Reviewer",
    access: "review — sees audit report & deltas",
    docs: "all",
    issues: "full",
    canDraft: false,
  },
};

export function isStakeholderType(value: string): value is StakeholderType {
  return STAKEHOLDER_TYPES.includes(value as StakeholderType);
}
