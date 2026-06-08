import { notFound } from "next/navigation";
import { requireMembershipBySlug } from "@/lib/auth/guard";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { MembersManager } from "@/components/settings/MembersManager";

// Authorization runs per-request against the DB; never statically cache.
export const dynamic = "force-dynamic";

export default async function MembersSettingsPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  // Managing members requires at least admin.
  const g = await requireMembershipBySlug(params.workspaceSlug, "admin");
  if (!g.ok) notFound();

  return (
    <main className="mx-auto max-w-[780px] overflow-y-auto px-5 py-12">
      <SettingsTabs slug={params.workspaceSlug} active="members" />
      <MembersManager />
    </main>
  );
}
