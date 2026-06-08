import { NextResponse } from "next/server";
import { z } from "zod";
import { guardError, requireCan, requireMembership } from "@/lib/auth/guard";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/projects/queries";
import { isAemoStage } from "@/lib/projects/stages";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string; projectId: string } };

// Accept ISO date strings (or null) for the timeline fields; coerce to Date.
const dateField = z
  .union([z.string().datetime(), z.string().length(0), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : v === null ? null : undefined));

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  capacityMw: z.string().trim().max(40).nullable().optional(),
  region: z.string().trim().max(80).nullable().optional(),
  aemoStage: z
    .union([
      z.string().refine((s) => isAemoStage(s), "Unknown AEMO stage."),
      z.null(),
    ])
    .optional(),
  submissionDate: dateField,
  deadline: dateField,
  stageEnteredAt: dateField,
});

/** Confirm the project belongs to the workspace the caller is gated on. */
async function loadScoped(workspaceId: string, projectId: string) {
  const project = await getProjectById(projectId);
  if (!project || project.workspaceId !== workspaceId) return null;
  return project;
}

/** GET — project details (any member can view). */
export async function GET(_req: Request, { params }: Params) {
  const g = await requireMembership(params.workspaceId, "viewer");
  if (!g.ok) return guardError(g);

  const project = await loadScoped(params.workspaceId, params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** PATCH — edit project metadata + timeline (requires 'upload'). */
export async function PATCH(request: Request, { params }: Params) {
  const g = await requireCan(params.workspaceId, "upload");
  if (!g.ok) return guardError(g);

  const project = await loadScoped(params.workspaceId, params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

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

  const updated = await updateProject(params.projectId, parsed.data);
  return NextResponse.json(updated);
}

/** DELETE — delete a project + its files/reports (owner/admin only). */
export async function DELETE(_req: Request, { params }: Params) {
  const g = await requireCan(params.workspaceId, "manage_workspace");
  if (!g.ok) return guardError(g);

  const project = await loadScoped(params.workspaceId, params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await deleteProject(params.projectId);
  return NextResponse.json({ ok: true });
}
