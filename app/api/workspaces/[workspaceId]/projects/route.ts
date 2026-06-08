import { NextResponse } from "next/server";
import { z } from "zod";
import { guardError, requireCan, requireMembership } from "@/lib/auth/guard";
import { createProject, listProjects } from "@/lib/projects/queries";
import { isAemoStage } from "@/lib/projects/stages";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string } };

const createSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(160),
  capacityMw: z.string().trim().max(40).optional(),
  region: z.string().trim().max(80).optional(),
  aemoStage: z
    .string()
    .trim()
    .refine((s) => isAemoStage(s), "Unknown AEMO stage.")
    .optional(),
});

/** GET — list the workspace's projects (any member can view). */
export async function GET(_req: Request, { params }: Params) {
  const g = await requireMembership(params.workspaceId, "viewer");
  if (!g.ok) return guardError(g);

  const projects = await listProjects(params.workspaceId);
  return NextResponse.json(projects);
}

/** POST — create a project (requires the 'upload' capability; viewers blocked). */
export async function POST(request: Request, { params }: Params) {
  const g = await requireCan(params.workspaceId, "upload");
  if (!g.ok) return guardError(g);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const project = await createProject({
    workspaceId: params.workspaceId,
    userId: g.user.id,
    name: parsed.data.name,
    capacityMw: parsed.data.capacityMw ?? null,
    region: parsed.data.region ?? null,
    aemoStage: parsed.data.aemoStage ?? null,
  });

  return NextResponse.json(project, { status: 201 });
}
