import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { guardError, requireCan, requireMembership } from "@/lib/auth/guard";
import type { Role } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string } };

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
});

/** GET — workspace details + the caller's role. */
export async function GET(_req: Request, { params }: Params) {
  const result = await requireMembership(params.workspaceId, "viewer");
  if (!result.ok) return guardError(result);

  return NextResponse.json({
    workspace: result.workspace,
    role: result.membership.role as Role,
  });
}

/** PATCH — rename the workspace (owner only). Slug stays stable on rename. */
export async function PATCH(request: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "manage_workspace");
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

  // Only the name changes — the slug is left intact to avoid breaking links.
  const [updated] = await db
    .update(workspaces)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(workspaces.id, params.workspaceId))
    .returning();

  return NextResponse.json({ workspace: updated });
}

/** DELETE — delete the workspace (owner only). Cascades to child rows. */
export async function DELETE(_req: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "manage_workspace");
  if (!result.ok) return guardError(result);

  await db.delete(workspaces).where(eq(workspaces.id, params.workspaceId));

  return NextResponse.json({ ok: true });
}
