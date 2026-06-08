"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { can, type Role } from "@/lib/auth/permissions";

type WorkspaceOption = { slug: string; name: string };

export function AppNav({
  currentSlug,
  role,
  user,
  workspaces,
}: {
  currentSlug: string;
  role: Role;
  user: { email: string; name?: string };
  workspaces: WorkspaceOption[];
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const current =
    workspaces.find((w) => w.slug === currentSlug) ?? {
      slug: currentSlug,
      name: currentSlug,
    };

  return (
    <header className="flex h-12 items-center justify-between border-b border-hairline bg-canvas px-5">
      {/* Left — wordmark + workspace switcher */}
      <div className="flex items-center gap-4">
        <Link
          href={`/w/${currentSlug}`}
          className="flex items-center gap-2"
        >
          <span className="grid h-7 w-7 place-items-center bg-ibm-blue text-xs font-semibold text-white">
            R1
          </span>
          <span className="text-sm font-semibold tracking-carbon text-ink">
            R1GPT
          </span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex items-center gap-2 border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-semibold tracking-carbon text-ink outline-none transition-colors hover:border-ibm-blue"
          >
            <span className="max-w-[180px] truncate">{current.name}</span>
            <span className="text-ink-subtle">▾</span>
          </button>

          {switcherOpen && (
            <>
              {/* Click-away backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSwitcherOpen(false)}
              />
              <div className="absolute left-0 z-20 mt-1 w-64 border border-hairline bg-canvas py-1 shadow-lg">
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
                  Workspaces
                </div>
                {workspaces.map((w) => {
                  const active = w.slug === currentSlug;
                  return (
                    <Link
                      key={w.slug}
                      href={`/w/${w.slug}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface-1 ${
                        active
                          ? "font-semibold text-ink"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <span className="flex-1 truncate tracking-carbon">
                        {w.name}
                      </span>
                      {active && (
                        <span className="text-[10px] text-ibm-blue">●</span>
                      )}
                    </Link>
                  );
                })}
                <div className="my-1 h-px bg-hairline" />
                <Link
                  href="/onboarding"
                  onClick={() => setSwitcherOpen(false)}
                  className="block px-3 py-2 text-sm text-ibm-blue transition-colors hover:bg-surface-1"
                >
                  + New workspace
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Workspace-scoped admin links */}
        {can(role, "manage_members") && (
          <Link
            href={`/w/${currentSlug}/settings/members`}
            className="text-xs tracking-carbon text-ink-muted transition-colors hover:text-ink"
          >
            Members
          </Link>
        )}
        {can(role, "manage_workspace") && (
          <Link
            href={`/w/${currentSlug}/settings`}
            className="text-xs tracking-carbon text-ink-muted transition-colors hover:text-ink"
          >
            Settings
          </Link>
        )}
      </div>

      {/* Right — current user + sign out */}
      <div className="flex items-center gap-3">
        <span className="hidden max-w-[220px] truncate font-mono text-[11px] text-ink-subtle sm:inline">
          {user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-semibold tracking-carbon text-ink-muted outline-none transition-colors hover:border-ibm-blue hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
