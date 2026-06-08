import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembershipBySlug } from "@/lib/auth/guard";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";

// Authorization runs per-request against the DB; never statically cache.
export const dynamic = "force-dynamic";

/**
 * Post-accept landing for an invited user. Renders under the workspace layout
 * (so it gets AppNav + WorkspaceProvider). A lightweight "you've joined" screen
 * — distinct from the inviter's create-workspace wizard.
 */
export default async function WelcomePage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  const g = await requireMembershipBySlug(params.workspaceSlug);
  if (!g.ok) notFound();

  const slug = g.workspace.slug;

  return (
    <main className="flex min-h-full items-center justify-center px-5 py-12">
      <div className="cds-tile w-full max-w-[480px] p-8 text-center">
        <span className="inline-block rounded-none border border-hairline bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-ibm-blue">
          You're in
        </span>

        <h1 className="mt-4 font-sans text-2xl font-light tracking-[-0.4px] text-ink">
          Welcome to {g.workspace.name}
        </h1>

        <p className="mt-2 font-sans text-sm text-ink-muted">
          You've joined as {ROLE_LABELS[g.membership.role as Role]}.
        </p>
        <p className="mt-1 font-sans text-sm text-ink-subtle">
          This workspace holds the team's projects, documents and audit history.
        </p>

        <Link
          href={`/w/${slug}`}
          className="cds-btn cds-btn--primary mt-6 inline-flex w-full justify-center"
        >
          Go to workspace
        </Link>
      </div>
    </main>
  );
}
