import { notFound, redirect } from "next/navigation";
import { requireMembershipBySlug } from "@/lib/auth/guard";
import { listWorkspacesForUser } from "@/lib/workspaces/queries";
import { WorkspaceProvider } from "@/lib/workspaces/context";
import { AppNav } from "@/components/dashboard/AppNav";
import type { Role } from "@/lib/auth/permissions";

// Per-request: resolves the workspace + membership against the DB, so this
// segment can never be statically cached.
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const g = await requireMembershipBySlug(params.workspaceSlug);

  if (!g.ok) {
    // 401 → no session: bounce to sign-in. 403/404 → don't leak existence: 404.
    if (g.status === 401) redirect("/signin");
    notFound();
  }

  const workspaces = await listWorkspacesForUser(g.user.id);
  const role = g.membership.role as Role;

  return (
    <WorkspaceProvider
      workspace={{
        id: g.workspace.id,
        slug: g.workspace.slug,
        name: g.workspace.name,
      }}
      role={role}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <AppNav
          currentSlug={g.workspace.slug}
          role={role}
          user={{ email: g.user.email, name: g.user.name }}
          workspaces={workspaces.map((w) => ({ slug: w.slug, name: w.name }))}
        />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </WorkspaceProvider>
  );
}
