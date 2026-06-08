import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { acceptInvite } from "@/lib/invites/queries";

export const dynamic = "force-dynamic";

type Params = { params: { token: string } };

/**
 * POST — accept an invite as the logged-in user.
 *
 * This route lives under /api so middleware already requires a session; we also
 * re-check here. The email-mismatch case is surfaced as 403, all other invalid
 * states (missing / revoked / expired / accepted) as 400.
 */
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const result = await acceptInvite({
    token: params.token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) {
    // Email-mismatch is a permission problem (403); everything else is 400.
    const status = /sign in with that address/i.test(result.reason)
      ? 403
      : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, workspaceSlug: result.workspace.slug });
}
