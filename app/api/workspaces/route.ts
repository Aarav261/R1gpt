import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createWorkspace,
  listWorkspacesForUser,
} from "@/lib/workspaces/queries";

// Reads the session on every request, so it can't be statically rendered.
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
});

/** GET /api/workspaces — list the current user's workspaces (with role). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const items = await listWorkspacesForUser(user.id);
  return NextResponse.json({ workspaces: items });
}

/** POST /api/workspaces — create a workspace owned by the current user. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

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

  try {
    const { workspace, project } = await createWorkspace({
      name: parsed.data.name,
      userId: user.id,
    });

    return NextResponse.json(
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        project: { id: project.id, slug: project.slug, name: project.name },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/workspaces]", err);
    return NextResponse.json(
      { error: "Could not create workspace." },
      { status: 500 },
    );
  }
}
