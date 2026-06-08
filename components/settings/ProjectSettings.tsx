"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspaces/context";
import { useProject } from "@/lib/projects/context";
import { AEMO_STAGES, AEMO_STAGE_LABELS } from "@/lib/projects/stages";

/** Convert an ISO timestamp to the `yyyy-mm-dd` a date input expects. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function ProjectSettings() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { project } = useProject();

  const [name, setName] = useState(project.name);
  const [capacityMw, setCapacityMw] = useState(project.capacityMw ?? "");
  const [region, setRegion] = useState(project.region ?? "");
  const [aemoStage, setAemoStage] = useState(project.aemoStage ?? "");
  const [submissionDate, setSubmissionDate] = useState(
    toDateInput(project.submissionDate),
  );
  const [deadline, setDeadline] = useState(toDateInput(project.deadline));

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspace.id}/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            capacityMw: capacityMw.trim() || null,
            region: region.trim() || null,
            aemoStage: aemoStage || null,
            submissionDate: submissionDate
              ? new Date(submissionDate).toISOString()
              : null,
            deadline: deadline ? new Date(deadline).toISOString() : null,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not save project settings.");
        return;
      }
      setStatus("Saved.");
      // Refresh server components (project list, dashboard) with new metadata.
      router.refresh();
    } catch {
      setError("Could not save project settings.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full border border-hairline bg-surface-1 px-3 py-2 text-sm text-ink outline-none focus:border-ibm-blue";
  const labelCls =
    "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle";

  return (
    <main className="mx-auto max-w-2xl overflow-y-auto px-6 py-10">
      <Link
        href={`/w/${workspace.slug}/p/${project.slug}`}
        className="text-xs text-ink-subtle hover:text-ibm-blue"
      >
        ← Back to project
      </Link>
      <h1 className="mt-3 text-2xl font-light tracking-carbon text-ink">
        Project settings
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Metadata and connection timeline. The timeline fields drive the AEMO
        clock and pipeline on the project overview.
      </p>

      <form onSubmit={save} className="mt-8 space-y-5">
        <div>
          <label className={labelCls}>Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Capacity</label>
            <input
              value={capacityMw}
              onChange={(e) => setCapacityMw(e.target.value)}
              disabled={saving}
              placeholder="200 MW"
              className={field}
            />
          </div>
          <div>
            <label className={labelCls}>Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={saving}
              placeholder="NSW"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>AEMO stage</label>
          <select
            value={aemoStage}
            onChange={(e) => setAemoStage(e.target.value)}
            disabled={saving}
            className={field}
          >
            <option value="">— Not set —</option>
            {AEMO_STAGES.map((s) => (
              <option key={s} value={s}>
                {AEMO_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Submission date</label>
            <input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              disabled={saving}
              className={field}
            />
          </div>
          <div>
            <label className={labelCls}>AEMO deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
              className={field}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="cds-btn cds-btn--primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status && <span className="text-sm text-success">{status}</span>}
          {error && <span className="text-sm text-error">{error}</span>}
        </div>
      </form>
    </main>
  );
}
