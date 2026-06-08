"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StakeholderType } from "@/lib/auth/permissions";

/**
 * Client-side project context.
 *
 * The project layout (app/(app)/w/[workspaceSlug]/p/[projectSlug]/layout.tsx)
 * resolves the active project + the caller's access via requireProjectAccess,
 * then hands them to this provider. Client components below it read
 * `useProject()` to scope all data fetches by `project.id` and to know whether
 * the viewer is a full team member or a scoped external guest.
 */

export type ProjectContextValue = {
  project: {
    id: string;
    slug: string;
    name: string;
    workspaceSlug: string;
    aemoStage: string | null;
    stageEnteredAt: string | null;
    submissionDate: string | null;
    deadline: string | null;
    capacityMw: string | null;
    region: string | null;
  };
  /** "team" = workspace member, "guest" = external scoped stakeholder. */
  access: "team" | "guest";
  /** Stakeholder lens driving content visibility. Team members are consultant. */
  stakeholderType: StakeholderType;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  value,
  children,
}: {
  value: ProjectContextValue;
  children: ReactNode;
}) {
  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

/** Read the active project + access. Throws if used outside the provider. */
export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error(
      "useProject() must be used within a <ProjectProvider>. " +
        "Ensure the component is rendered inside the /p/[projectSlug] layout.",
    );
  }
  return ctx;
}
