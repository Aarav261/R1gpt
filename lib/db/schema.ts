import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for the multi-tenant data model.
 *
 * Conventions:
 * - UUID primary keys with `defaultRandom()` (gen_random_uuid in Postgres).
 * - `timestamptz` everywhere via `{ withTimezone: true }`, with `defaultNow()`
 *   on created_at columns.
 * - Foreign keys cascade on delete from the owning workspace so tearing down a
 *   workspace cleans up its memberships, invites, files and reports.
 *
 * The `document_type` column on files mirrors the string values of the
 * `DocumentType` enum in types/documents.ts. It is stored as plain text (rather
 * than a pgEnum) so adding a new document type does not require a DB migration.
 */

// Membership / invite roles, ordered most → least privileged.
export const roleEnum = pgEnum("role", ["owner", "admin", "member", "viewer"]);

// Lifecycle of a workspace invite.
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// workspaces
// ---------------------------------------------------------------------------
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// projects — a connection project inside a workspace. A workspace (the team /
// consultancy) holds many projects; files, audits, issues and activity are
// scoped to a project. `aemo_stage` is plain text (like document_type) so new
// stages don't require a migration — see lib/projects/stages.ts for the
// ordered canonical list.
// ---------------------------------------------------------------------------
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    capacityMw: text("capacity_mw"),
    region: text("region"),
    // Mirrors AemoStage values in lib/projects/stages.ts (stored as text).
    aemoStage: text("aemo_stage"),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }),
    submissionDate: timestamp("submission_date", { withTimezone: true }),
    deadline: timestamp("deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceSlugUnique: unique("projects_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
  }),
);

// ---------------------------------------------------------------------------
// memberships — links a user to a workspace with a role. One row per pair.
// ---------------------------------------------------------------------------
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceUserUnique: unique("memberships_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
  }),
);

// ---------------------------------------------------------------------------
// invites — pending workspace invitations keyed by a single-use token.
// ---------------------------------------------------------------------------
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  status: inviteStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// files — uploaded documents, stored in blob storage, scoped to a workspace.
// ---------------------------------------------------------------------------
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  storageUrl: text("storage_url").notNull(),
  pathname: text("pathname").notNull(),
  // Matches DocumentType values in types/documents.ts (e.g. "gps_baseline").
  documentType: text("document_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// audit_reports — completed audits. `payload` holds the full AuditReport object
// (see types/report.ts) as JSONB.
// ---------------------------------------------------------------------------
export const auditReports = pgTable("audit_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  auditId: text("audit_id").notNull().unique(),
  projectName: text("project_name").notNull(),
  readinessIndex: integer("readiness_index"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred row types (select / insert) for use across the app.
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;

export type AuditReportRow = typeof auditReports.$inferSelect;
export type NewAuditReportRow = typeof auditReports.$inferInsert;
