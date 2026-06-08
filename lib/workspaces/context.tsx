"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/lib/auth/permissions";

/**
 * Client-side workspace context.
 *
 * The server layout (app/(app)/w/[workspaceSlug]/layout.tsx) resolves the
 * active workspace + the caller's role via the RBAC guard, then hands them to
 * this provider. Client components below it read `useWorkspace()` instead of
 * re-deriving the slug from the URL, and use `workspace.id` to scope all
 * audit data fetches.
 */

export type WorkspaceContextValue = {
  workspace: { id: string; slug: string; name: string };
  role: Role;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  workspace,
  role,
  children,
}: {
  workspace: { id: string; slug: string; name: string };
  role: Role;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={{ workspace, role }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/** Read the active workspace + role. Throws if used outside the provider. */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspace() must be used within a <WorkspaceProvider>. " +
        "Ensure the component is rendered inside the /w/[workspaceSlug] layout."
    );
  }
  return ctx;
}
