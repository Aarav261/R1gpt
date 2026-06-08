import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listWorkspacesForUser } from "@/lib/workspaces/queries";

// Resolves the signed-in user's home: their first workspace, onboarding, or
// sign-in. Reads the session + DB per request, so never statically cached.
export const dynamic = "force-dynamic";

export default async function RootResolver() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/signin");

  const workspaces = await listWorkspacesForUser(user.id);
  if (workspaces.length === 0) redirect("/onboarding");

  redirect(`/w/${workspaces[0].slug}`);
}
