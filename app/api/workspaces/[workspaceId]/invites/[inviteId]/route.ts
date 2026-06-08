import { NextResponse } from "next/server";
import { guardError, requireCan } from "@/lib/auth/guard";
import { revokeInvite } from "@/lib/invites/queries";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string; inviteId: string } };

/** DELETE — revoke a pending invite. Requires `invite` (admin+). */
export async function DELETE(_req: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "invite");
  if (!result.ok) return guardError(result);

  await revokeInvite(params.inviteId, params.workspaceId);
  return NextResponse.json({ ok: true });
}
