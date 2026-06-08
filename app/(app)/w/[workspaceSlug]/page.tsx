import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembershipBySlug } from "@/lib/auth/guard";
import { listProjects } from "@/lib/projects/queries";
import { AEMO_STAGE_LABELS, isAemoStage } from "@/lib/projects/stages";
import { NewProjectButton } from "@/components/dashboard/NewProjectButton";

export const dynamic = "force-dynamic";

export default async function WorkspaceProjectsPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  const g = await requireMembershipBySlug(params.workspaceSlug);
  if (!g.ok) {
    if (g.status === 401) redirect("/signin");
    notFound();
  }

  const projects = await listProjects(g.workspace.id);

  return (
    <main className="mx-auto max-w-5xl overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-carbon text-ink">
            {g.workspace.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <NewProjectButton
          workspaceId={g.workspace.id}
          workspaceSlug={g.workspace.slug}
        />
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 border border-dashed border-hairline bg-canvas px-8 py-12 text-center">
          <h2 className="text-lg font-normal text-ink">No projects yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Create your first connection project to upload documents and run a
            pre-submission audit.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const stage =
              p.aemoStage && isAemoStage(p.aemoStage)
                ? AEMO_STAGE_LABELS[p.aemoStage]
                : "No stage set";
            return (
              <Link
                key={p.id}
                href={`/w/${g.workspace.slug}/p/${p.slug}`}
                className="group border border-hairline bg-surface-1 p-5 transition-colors hover:border-ibm-blue"
              >
                <div className="text-sm font-semibold tracking-carbon text-ink group-hover:text-ibm-blue">
                  {p.name}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-muted">
                  {p.capacityMw && (
                    <span className="border border-hairline px-1.5 py-0.5">
                      {p.capacityMw}
                    </span>
                  )}
                  {p.region && (
                    <span className="border border-hairline px-1.5 py-0.5">
                      {p.region}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-wide text-ink-subtle">
                  {stage}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
