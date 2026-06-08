import { NextResponse } from "next/server";
import { z } from "zod";
import { guardError, requireCan } from "@/lib/auth/guard";
import { createInvite, listInvites } from "@/lib/invites/queries";
import { sendInviteEmail } from "@/lib/email/sendInvite";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string } };

// Invitable roles. 'owner' is excluded — ownership transfer is out of scope.
const createSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  role: z.enum(["admin", "member", "viewer"]),
});

/** GET — list pending invites for the workspace. Requires `invite` (admin+). */
export async function GET(_req: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "invite");
  if (!result.ok) return guardError(result);

  const items = await listInvites(params.workspaceId);
  return NextResponse.json({ invites: items });
}

/** POST — create + email an invite. Requires `invite` (admin+). */
export async function POST(request: Request, { params }: Params) {
  const result = await requireCan(params.workspaceId, "invite");
  if (!result.ok) return guardError(result);

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

  const invite = await createInvite({
    workspaceId: params.workspaceId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedBy: result.user.id,
  });

  // Base URL: prefer the configured origin, fall back to localhost for dev.
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;

  // Best-effort delivery; never throws (always logs the link too).
  await sendInviteEmail({
    to: invite.email,
    inviteUrl,
    workspaceName: result.workspace.name,
    inviterName: result.user.name,
  });

  // Include the URL so the UI can show/copy it directly in dev.
  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}
