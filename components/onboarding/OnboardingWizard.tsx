"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { uploadWorkspaceFile } from "@/lib/files/client";

/**
 * Standalone onboarding wizard (rendered outside the workspace layout, so it
 * has no WorkspaceProvider / AppNav). Four steps:
 *   1. Create a workspace (POST /api/workspaces → {id, slug, name}).
 *   2. Workspace settings — rename + show the workspace URL.
 *   3. Add files — upload one or more documents.
 *   4. Optionally invite teammates, then route into /w/{slug}.
 */

type InvitableRole = Exclude<Role, "owner">;
const INVITABLE_ROLES: InvitableRole[] = ["admin", "member", "viewer"];

// The workspace created in step 1, carried through later steps. Includes the
// seed project so file uploads have a home and we can route into the dashboard.
type CreatedWorkspace = {
  id: string;
  slug: string;
  name: string;
  project: { id: string; slug: string; name: string };
};

type InviteRow = {
  email: string;
  role: InvitableRole;
  // Result of the last send attempt for this row (null = not yet sent).
  status: "ok" | "error" | null;
  message?: string;
  inviteUrl?: string;
};

type WizardStep = 1 | 2 | 3 | 4;

export function OnboardingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);

  // Created workspace (set after step 1 succeeds).
  const [workspace, setWorkspace] = useState<CreatedWorkspace | null>(null);

  return (
    <div className="w-full max-w-[480px]">
      {/* Top bar — welcome + sign out */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-sans text-3xl font-light tracking-[-0.4px] text-ink">
              R1GPT
            </h1>
            <span className="rounded-none border border-hairline bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-ibm-blue">
              Welcome
            </span>
          </div>
          <p className="mt-1 font-sans text-sm text-ink-muted">
            Signed in as {userEmail}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-semibold tracking-carbon text-ink-muted outline-none transition-colors hover:border-ibm-blue hover:text-ink"
        >
          Sign out
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-2 font-mono text-[11px] text-ink-subtle">
        <span className={step === 1 ? "text-ibm-blue" : "text-ink-subtle"}>
          1. Workspace
        </span>
        <span>→</span>
        <span className={step === 2 ? "text-ibm-blue" : "text-ink-subtle"}>
          2. Settings
        </span>
        <span>→</span>
        <span className={step === 3 ? "text-ibm-blue" : "text-ink-subtle"}>
          3. Files
        </span>
        <span>→</span>
        <span className={step === 4 ? "text-ibm-blue" : "text-ink-subtle"}>
          4. Invite
        </span>
      </div>

      {step === 1 ? (
        <CreateWorkspaceStep
          onCreated={(ws) => {
            setWorkspace(ws);
            setStep(2);
          }}
        />
      ) : !workspace ? null : step === 2 ? (
        <WorkspaceSettingsStep
          workspace={workspace}
          onRenamed={(name) => setWorkspace({ ...workspace, name })}
          onContinue={() => setStep(3)}
        />
      ) : step === 3 ? (
        <AddFilesStep
          workspaceId={workspace.id}
          projectId={workspace.project.id}
          onContinue={() => setStep(4)}
        />
      ) : (
        <InviteTeamStep
          workspaceId={workspace.id}
          onFinish={() =>
            router.push(`/w/${workspace.slug}/p/${workspace.project.slug}`)
          }
        />
      )}
    </div>
  );
}

/** Step 1 — name + create the workspace. */
function CreateWorkspaceStep({
  onCreated,
}: {
  onCreated: (ws: CreatedWorkspace) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        setError("A workspace name is required.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const data = (await res.json()) as {
          id?: string;
          slug?: string;
          name?: string;
          project?: { id: string; slug: string; name: string };
          error?: string;
        };
        if (!res.ok || !data.id || !data.slug || !data.project) {
          setError(data.error ?? "Could not create workspace.");
          return;
        }
        onCreated({
          id: data.id,
          slug: data.slug,
          name: data.name ?? name.trim(),
          project: data.project,
        });
      } catch {
        setError("Could not create workspace.");
      } finally {
        setSubmitting(false);
      }
    },
    [name, onCreated],
  );

  return (
    <div className="cds-tile p-8">
      <h2 className="font-sans text-lg font-light text-ink">
        Create your workspace
      </h2>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Workspaces hold your projects, documents and audit history.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="ws-name"
            className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle"
          >
            Workspace name
          </label>
          <input
            id="ws-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Acme Grid Connections"
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
        </div>

        {error && (
          <p className="rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="cds-btn cds-btn--primary w-full disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

/** Step 2 — rename the workspace and show its URL. */
function WorkspaceSettingsStep({
  workspace,
  onRenamed,
  onContinue,
}: {
  workspace: CreatedWorkspace;
  onRenamed: (name: string) => void;
  onContinue: () => void;
}) {
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueStep = useCallback(async () => {
    const trimmed = name.trim();
    // Nothing changed (or emptied) — just advance.
    if (!trimmed || trimmed === workspace.name) {
      onContinue();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not save workspace settings.");
        return;
      }
      onRenamed(trimmed);
      onContinue();
    } catch {
      setError("Could not save workspace settings.");
    } finally {
      setSaving(false);
    }
  }, [name, workspace.id, workspace.name, onRenamed, onContinue]);

  return (
    <div className="cds-tile p-8">
      <h2 className="font-sans text-lg font-light text-ink">
        Workspace settings
      </h2>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Confirm your workspace name. You can change this later in settings.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="ws-rename"
            className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle"
          >
            Workspace name
          </label>
          <input
            id="ws-rename"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
        </div>

        <div>
          <span className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle">
            Workspace URL
          </span>
          <div className="w-full rounded-none border border-hairline bg-canvas px-4 py-3 font-mono text-sm text-ink-muted">
            /w/{workspace.slug}
          </div>
        </div>

        {error && (
          <p className="rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={continueStep}
            disabled={saving}
            className="cds-btn cds-btn--primary flex-1 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="cds-btn cds-btn--tertiary flex-1 disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// Per-file row in the add-files step.
type UploadItem = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
};

/** Human-readable byte size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Step 3 — pick and upload one or more files. */
function AddFilesStep({
  workspaceId,
  projectId,
  onContinue,
}: {
  workspaceId: string;
  projectId: string;
  onContinue: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map<UploadItem>((file) => ({
      file,
      status: "pending",
    }));
    setItems((prev) => [...prev, ...next]);
    // Reset the input so the same file can be re-selected after removal.
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const removeItem = useCallback((i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const uploadAndContinue = useCallback(async () => {
    const hasPending = items.some((it) => it.status === "pending");
    if (!hasPending) {
      onContinue();
      return;
    }
    setUploading(true);
    let hadError = false;

    // Upload pending items sequentially, updating each row's state.
    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== "pending") continue;
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: "uploading", message: undefined } : it,
        ),
      );
      try {
        await uploadWorkspaceFile(workspaceId, projectId, items[i].file);
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "done", message: "Uploaded." } : it,
          ),
        );
      } catch (err) {
        hadError = true;
        const message = err instanceof Error ? err.message : "Upload failed.";
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "error", message } : it,
          ),
        );
      }
    }

    setUploading(false);
    // Advance only if everything uploaded; otherwise stay so errors are visible
    // (the user can still Skip for now).
    if (!hadError) onContinue();
  }, [items, workspaceId, projectId, onContinue]);

  const hasPending = items.some((it) => it.status === "pending");

  return (
    <div className="cds-tile p-8">
      <h2 className="font-sans text-lg font-light text-ink">Add files</h2>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Optional — upload documents to get started. You can add more later.
      </p>

      <div className="mt-6">
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          disabled={uploading}
          className="block w-full font-sans text-sm text-ink-muted file:mr-3 file:cursor-pointer file:rounded-none file:border file:border-hairline file:bg-surface-1 file:px-3 file:py-2 file:font-sans file:text-sm file:text-ink hover:file:border-ibm-blue disabled:opacity-50"
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-none border border-hairline bg-surface-1 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink">
                  {it.file.name}
                </span>
                <span className="font-mono text-[11px] text-ink-subtle">
                  {formatSize(it.file.size)}
                </span>
                {it.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={uploading}
                    className="px-1 font-sans text-lg leading-none text-ink-subtle hover:text-error disabled:opacity-50"
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                ) : (
                  <span
                    className={`font-mono text-[11px] ${
                      it.status === "done"
                        ? "text-success"
                        : it.status === "error"
                          ? "text-error"
                          : "text-ink-subtle"
                    }`}
                  >
                    {it.status === "uploading" ? "Uploading…" : it.status}
                  </span>
                )}
              </div>
              {it.status === "error" && it.message && (
                <p className="mt-1 font-sans text-xs text-error">
                  {it.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={uploadAndContinue}
          disabled={uploading}
          className="cds-btn cds-btn--primary flex-1 disabled:opacity-50"
        >
          {uploading
            ? "Uploading…"
            : hasPending
              ? "Upload & continue"
              : "Continue"}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={uploading}
          className="cds-btn cds-btn--tertiary flex-1 disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/** Step 4 — optionally invite teammates, then enter the workspace. */
function InviteTeamStep({
  workspaceId,
  onFinish,
}: {
  workspaceId: string;
  onFinish: () => void;
}) {
  const [rows, setRows] = useState<InviteRow[]>([
    { email: "", role: "member", status: null },
  ]);
  const [sending, setSending] = useState(false);

  const updateRow = useCallback(
    (i: number, patch: Partial<InviteRow>) => {
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { email: "", role: "member", status: null }]);
  }, []);

  const removeRow = useCallback((i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const sendInvites = useCallback(async () => {
    setSending(true);
    // Send each non-empty row sequentially, recording per-row results.
    const results = await Promise.all(
      rows.map(async (row): Promise<InviteRow> => {
        if (!row.email.trim()) return { ...row, status: null };
        try {
          const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: row.email.trim(), role: row.role }),
          });
          const data = (await res.json()) as {
            error?: string;
            inviteUrl?: string;
          };
          if (!res.ok) {
            return {
              ...row,
              status: "error",
              message: data.error ?? "Failed to send.",
            };
          }
          return {
            ...row,
            status: "ok",
            message: "Invite sent.",
            inviteUrl: data.inviteUrl,
          };
        } catch {
          return { ...row, status: "error", message: "Failed to send." };
        }
      }),
    );
    setRows(results);
    setSending(false);
  }, [rows, workspaceId]);

  const hasAnyEmail = rows.some((r) => r.email.trim().length > 0);

  return (
    <div className="cds-tile p-8">
      <h2 className="font-sans text-lg font-light text-ink">
        Invite your team
      </h2>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Optional — you can always add people later from workspace settings.
      </p>

      <div className="mt-6 space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={row.email}
                onChange={(e) => updateRow(i, { email: e.target.value })}
                disabled={sending}
                placeholder="teammate@example.com"
                className="flex-1 rounded-none border border-hairline bg-surface-1 px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
              />
              <select
                value={row.role}
                onChange={(e) =>
                  updateRow(i, { role: e.target.value as InvitableRole })
                }
                disabled={sending}
                className="rounded-none border border-hairline bg-surface-1 px-2 py-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-ibm-blue"
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={sending}
                  className="px-2 font-sans text-lg text-ink-subtle hover:text-error disabled:opacity-50"
                  aria-label="Remove row"
                >
                  ×
                </button>
              )}
            </div>
            {row.status && row.message && (
              <p
                className={`font-sans text-xs ${
                  row.status === "ok" ? "text-success" : "text-error"
                }`}
              >
                {row.message}
              </p>
            )}
            {row.status === "ok" && row.inviteUrl && (
              <input
                readOnly
                value={row.inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-none border border-hairline bg-canvas px-2 py-1.5 font-mono text-[11px] text-ink-muted outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={sending}
        className="mt-3 font-sans text-sm text-ibm-blue underline-offset-4 hover:underline disabled:opacity-50"
      >
        + Add another
      </button>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={sendInvites}
          disabled={sending || !hasAnyEmail}
          className="cds-btn cds-btn--primary flex-1 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send invites"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="cds-btn cds-btn--tertiary flex-1"
        >
          {hasAnyEmail ? "Go to workspace" : "Skip"}
        </button>
      </div>
    </div>
  );
}
