import { notFound } from "next/navigation";
import { requireMembershipBySlug } from "@/lib/auth/guard";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm";

// Authorization runs per-request against the DB; never statically cache.
export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  // General settings (rename / delete) are owner-only.
  const g = await requireMembershipBySlug(params.workspaceSlug, "owner");
  if (!g.ok) notFound();

  return (
    <main className="mx-auto max-w-[780px] overflow-y-auto px-5 py-12">
      <SettingsTabs slug={params.workspaceSlug} active="general" />
      <WorkspaceSettingsForm />
    </main>
  );
}
