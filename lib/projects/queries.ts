import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { projects, type Project } from "@/lib/db/schema";
import { slugify } from "@/lib/workspaces/queries";

/**
 * Pure data-access layer for projects (a connection project inside a
 * workspace). Like lib/workspaces/queries.ts these functions do NOT perform
 * auth checks — callers gate via lib/auth/guard.
 */

/** Editable project metadata (timeline + descriptive fields). */
export type ProjectMetadata = Partial<{
  name: string;
  capacityMw: string | null;
  region: string | null;
  aemoStage: string | null;
  stageEnteredAt: Date | null;
  submissionDate: Date | null;
  deadline: Date | null;
}>;

/**
 * Create a project in a workspace. Slug is `slugify(name)-<nanoid(6)>` so two
 * projects with the same name don't collide on the (workspace, slug) unique
 * constraint.
 */
export async function createProject({
  workspaceId,
  userId,
  name,
  capacityMw,
  region,
  aemoStage,
}: {
  workspaceId: string;
  userId: string;
  name: string;
  capacityMw?: string | null;
  region?: string | null;
  aemoStage?: string | null;
}): Promise<Project> {
  const slug = `${slugify(name)}-${nanoid(6).toLowerCase()}`;
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      createdBy: userId,
      name,
      slug,
      capacityMw: capacityMw ?? null,
      region: region ?? null,
      aemoStage: aemoStage ?? null,
      stageEnteredAt: aemoStage ? new Date() : null,
    })
    .returning();
  return project;
}

/** All projects in a workspace, newest first. */
export async function listProjects(workspaceId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.createdAt));
}

/** Look up a project by id. */
export async function getProjectById(id: string): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return row ?? null;
}

/** Look up a project by (workspace, slug) — for page routing. */
export async function getProjectBySlug(
  workspaceId: string,
  slug: string,
): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug)))
    .limit(1);
  return row ?? null;
}

/**
 * Update editable project metadata. When the stage changes we stamp
 * `stageEnteredAt` so the "days in stage" widget measures from the transition.
 */
export async function updateProject(
  id: string,
  patch: ProjectMetadata,
): Promise<Project | null> {
  const current = await getProjectById(id);
  if (!current) return null;

  const stageChanged =
    patch.aemoStage !== undefined && patch.aemoStage !== current.aemoStage;

  const [row] = await db
    .update(projects)
    .set({
      ...patch,
      // Caller may pass stageEnteredAt explicitly; otherwise auto-stamp on
      // stage change.
      stageEnteredAt:
        patch.stageEnteredAt !== undefined
          ? patch.stageEnteredAt
          : stageChanged
            ? new Date()
            : current.stageEnteredAt,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();
  return row ?? null;
}

/** Delete a project (cascades to its files, audit reports, issues, etc.). */
export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}
