import { notFound, redirect } from "next/navigation";
import { requireProjectAccess } from "@/lib/auth/guard";
import { ProjectProvider } from "@/lib/projects/context";

// Per-request: resolves the project + access against the DB, so this segment
// can never be statically cached.
export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const g = await requireProjectAccess(params.workspaceSlug, params.projectSlug);

  if (!g.ok) {
    if (g.status === 401) redirect("/signin");
    notFound();
  }

  const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

  return (
    <ProjectProvider
      value={{
        project: {
          id: g.project.id,
          slug: g.project.slug,
          name: g.project.name,
          workspaceSlug: g.workspace.slug,
          aemoStage: g.project.aemoStage,
          stageEnteredAt: iso(g.project.stageEnteredAt),
          submissionDate: iso(g.project.submissionDate),
          deadline: iso(g.project.deadline),
          capacityMw: g.project.capacityMw,
          region: g.project.region,
        },
        access: g.access,
        stakeholderType: g.stakeholderType,
      }}
    >
      {children}
    </ProjectProvider>
  );
}
