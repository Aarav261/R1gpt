import Link from "next/link";
import { getInviteByToken } from "@/lib/invites/queries";
import { getWorkspaceById } from "@/lib/workspaces/queries";
import { getCurrentUser } from "@/lib/auth/session";
import AcceptInvite from "./AcceptInvite";

// Reads the session + invite on every request — never statically rendered.
export const dynamic = "force-dynamic";

type Params = { params: { token: string } };

/**
 * Public invite landing page (middleware allowlists `/invite`).
 *
 * It resolves the invite DIRECTLY via the query layer rather than fetching the
 * API so it keeps working for logged-out visitors. Four states are rendered:
 *   a) invalid / revoked / expired token
 *   b) valid + logged out
 *   c) valid + logged in as the invited email (→ AcceptInvite)
 *   d) valid + logged in as a different email
 */
export default async function InvitePage({ params }: Params) {
  const { token } = params;
  const invite = await getInviteByToken(token);

  // --- State (a): missing / revoked / expired / already accepted ----------
  const isLive =
    invite &&
    invite.status === "pending" &&
    invite.expiresAt.getTime() >= Date.now();

  if (!invite || !isLive) {
    return (
      <Shell badge="Invite">
        <h1 className="font-sans text-2xl font-light tracking-[-0.4px] text-ink">
          This invite isn’t available
        </h1>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          The link may have expired, been revoked, or already been used.
        </p>
        <Link
          href="/"
          className="cds-btn cds-btn--primary mt-6 inline-flex w-full justify-center"
        >
          Go home
        </Link>
      </Shell>
    );
  }

  // Invite is live — load context for the message.
  const workspace = await getWorkspaceById(invite.workspaceId);
  const workspaceName = workspace?.name ?? "the workspace";
  const user = await getCurrentUser();

  // --- State (b): valid + logged OUT --------------------------------------
  if (!user?.email) {
    const emailParam = encodeURIComponent(invite.email);
    const callbackParam = encodeURIComponent(`/invite/${token}`);
    return (
      <Shell badge="Invite">
        <h1 className="font-sans text-2xl font-light tracking-[-0.4px] text-ink">
          Join {workspaceName}
        </h1>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          You’ve been invited to join {workspaceName}. Sign in or create an
          account with{" "}
          <span className="font-mono text-ink">{invite.email}</span> to accept.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href={`/signup?email=${emailParam}&callbackUrl=${callbackParam}`}
            className="cds-btn cds-btn--primary inline-flex w-full justify-center"
          >
            Create account
          </Link>
          <Link
            href={`/signin?email=${emailParam}&callbackUrl=${callbackParam}`}
            className="cds-btn inline-flex w-full justify-center border border-hairline text-ink hover:border-ibm-blue"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  // --- State (d): logged IN as a DIFFERENT email --------------------------
  if (user.email.toLowerCase() !== invite.email) {
    const signoutCallback = encodeURIComponent(`/invite/${token}`);
    return (
      <Shell badge="Invite">
        <h1 className="font-sans text-2xl font-light tracking-[-0.4px] text-ink">
          Wrong account
        </h1>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          This invite was sent to{" "}
          <span className="font-mono text-ink">{invite.email}</span>, but you’re
          signed in as{" "}
          <span className="font-mono text-ink">{user.email}</span>. Sign out and
          sign back in with {invite.email} to accept.
        </p>
        <Link
          href={`/api/auth/signout?callbackUrl=${signoutCallback}`}
          className="cds-btn cds-btn--primary mt-6 inline-flex w-full justify-center"
        >
          Sign out
        </Link>
      </Shell>
    );
  }

  // --- State (c): logged IN as the invited email --------------------------
  return (
    <Shell badge="Invite">
      <h1 className="font-sans text-2xl font-light tracking-[-0.4px] text-ink">
        Join {workspaceName}
      </h1>
      <p className="mb-6 mt-2 font-sans text-sm text-ink-muted">
        You’re signed in as{" "}
        <span className="font-mono text-ink">{user.email}</span>. Accept the
        invitation to join {workspaceName}.
      </p>
      <AcceptInvite token={token} workspaceName={workspaceName} />
    </Shell>
  );
}

/**
 * Shared centered tile shell, mirroring app/(auth)/layout + the signin tile so
 * the invite screens share the Carbon dark visual language.
 */
function Shell({
  badge,
  children,
}: {
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="cds-tile p-8">
          <header className="mb-6">
            <div className="flex items-baseline gap-3">
              <h1 className="font-sans text-3xl font-light tracking-[-0.4px] text-ink">
                R1GPT
              </h1>
              <span className="rounded-none border border-hairline bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-ibm-blue">
                {badge}
              </span>
            </div>
            <p className="mt-1 font-sans text-sm text-ink-muted">
              Connection Approval Workspace
            </p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
