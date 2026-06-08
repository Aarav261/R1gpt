import { NextResponse } from "next/server";
import { guardError, requireMembership } from "@/lib/auth/guard";
import { listMembers } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string } };

/** GET — list workspace members (any member may view). */
export async function GET(_req: Request, { params }: Params) {
  const result = await requireMembership(params.workspaceId, "viewer");
  if (!result.ok) return guardError(result);

  const members = await listMembers(params.workspaceId);
  return NextResponse.json({ members });
}
