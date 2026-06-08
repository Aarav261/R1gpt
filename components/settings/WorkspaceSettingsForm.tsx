"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspaces/context";

/**
 * Workspace general settings (owner only — the page guards entry).
 *
 * Two concerns: rename the workspace, and the danger zone that deletes it. The
 * delete is gated behind a typed confirmation matching the workspace name to
 * make it deliberately hard to do by accident.
 */
export function WorkspaceSettingsForm() {
  const router = useRouter();
  const { workspace } = useWorkspace();

  // --- Rename ---
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim().length > 0 && name.trim() !== workspace.name;

  const save = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setSaveError(null);
      setSaved(false);
      try {
        const res = await fetch(`/api/workspaces/${workspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setSaveError(data.error ?? "Could not rename workspace.");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setSaveError("Could not rename workspace.");
      } finally {
        setSaving(false);
      }
    },
    [workspace.id, name, router],
  );

  // --- Delete ---
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete = confirmText === workspace.name && !deleting;

  const remove = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? "Could not delete workspace.");
        setDeleting(false);
        return;
      }
      router.push("/");
    } catch {
      setDeleteError("Could not delete workspace.");
      setDeleting(false);
    }
  }, [workspace.id, router]);

  return (
    <div className="space-y-10">
      {/* Rename */}
      <section>
        <h2 className="mb-3 font-sans text-sm font-semibold tracking-carbon text-ink">
          Workspace name
        </h2>
        <form
          onSubmit={save}
          className="flex flex-wrap items-end gap-3 border border-hairline bg-canvas p-4"
        >
          <div className="flex-1 min-w-[220px]">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
              className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors focus:border-ibm-blue"
            />
          </div>
          <button
            type="submit"
            disabled={!dirty || saving}
            className="cds-btn cds-btn--primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {saved && (
          <p className="mt-2 font-sans text-sm text-success">Saved.</p>
        )}
        {saveError && (
          <p className="mt-2 rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
            {saveError}
          </p>
        )}
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="mb-3 font-sans text-sm font-semibold tracking-carbon text-error">
          Danger zone
        </h2>
        <div className="border border-error/40 bg-error/5 p-4">
          <p className="font-sans text-sm text-ink">
            Delete this workspace
          </p>
          <p className="mt-1 font-sans text-xs text-ink-muted">
            Permanently removes the workspace, its members, files and audit
            history. This cannot be undone. Type{" "}
            <span className="font-mono text-ink">{workspace.name}</span> to
            confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder={workspace.name}
              className="flex-1 min-w-[220px] rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-error"
            />
            <button
              onClick={remove}
              disabled={!canDelete}
              className="cds-btn cds-btn--danger disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete workspace"}
            </button>
          </div>
          {deleteError && (
            <p className="mt-3 rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
              {deleteError}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
