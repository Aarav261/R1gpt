"use client";

import Link from "next/link";

/**
 * Shared header for the workspace settings area. Renders a wordmark and a
 * two-tab nav ("General" / "Members") that both settings pages mount, so the
 * caller only passes the active tab + the workspace slug.
 */
export function SettingsTabs({
  slug,
  active,
}: {
  slug: string;
  active: "general" | "members";
}) {
  const tabs = [
    { key: "general" as const, label: "General", href: `/w/${slug}/settings` },
    {
      key: "members" as const,
      label: "Members",
      href: `/w/${slug}/settings/members`,
    },
  ];

  return (
    <header className="mb-8">
      <Link
        href={`/w/${slug}`}
        className="font-sans text-xs text-ink-subtle hover:text-ibm-blue"
      >
        ← Back to workspace
      </Link>
      <h1 className="mt-3 font-sans text-2xl font-light tracking-[-0.4px] text-ink">
        Workspace settings
      </h1>

      <nav className="mt-5 flex gap-6 border-b border-hairline">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`-mb-px border-b-2 pb-2 font-sans text-sm transition-colors ${
                isActive
                  ? "border-ibm-blue text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
