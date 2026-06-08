"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline "New project" control for the workspace project list. Creates a project
 * via POST /api/workspaces/[id]/projects, then routes into its dashboard.
 */
export function NewProjectButton({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacityMw, setCapacityMw] = useState("");
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          capacityMw: capacityMw.trim() || undefined,
          region: region.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.slug) {
        setError(data.error ?? "Could not create project.");
        return;
      }
      router.push(`/w/${workspaceSlug}/p/${data.slug}`);
    } catch {
      setError("Could not create project.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="cds-btn cds-btn--primary cds-btn--sm"
      >
        + New project
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 border border-hairline bg-surface-1 p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          Project name
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          placeholder="e.g. Wattle Creek BESS 200MW"
          className="w-64 border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ibm-blue"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          Capacity
        </span>
        <input
          value={capacityMw}
          onChange={(e) => setCapacityMw(e.target.value)}
          disabled={submitting}
          placeholder="200 MW"
          className="w-28 border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ibm-blue"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          Region
        </span>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={submitting}
          placeholder="NSW"
          className="w-28 border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ibm-blue"
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="cds-btn cds-btn--primary cds-btn--sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={submitting}
        className="cds-btn cds-btn--tertiary cds-btn--sm"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-error">{error}</p>}
    </form>
  );
}
