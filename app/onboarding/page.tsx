import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

// Onboarding lives outside the workspace layout (no AppNav / WorkspaceProvider).
// Middleware already requires a session; we re-check to obtain the user email.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/signin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <OnboardingWizard userEmail={user.email} />
    </main>
  );
}
