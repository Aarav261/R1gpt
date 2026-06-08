"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspaces/context";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";

/**
 * Members management surface (admin/owner only — the page guards entry).
 *
 * Loads members + pending invites for the active workspace, lets the caller
 * change roles / remove members, send invites and revoke them. Every mutation
 * surfaces the server's guard error message inline (the API enforces the real
 * rules: last-owner protection, owner-only owner grants, etc.) so the UI stays
 * permissive and lets the backend be the source of truth.
 */

type MemberRow = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  joinedAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  status: string;
};

const ALL_ROLES: Role[] = ["owner", "admin", "member", "viewer"];
const INVITABLE_ROLES: Exclude<Role, "owner">[] = ["admin", "member", "viewer"];

// Extract a server { error } message from a fetch Response (best-effort).
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function MembersManager() {
  const { workspace, role: callerRole } = useWorkspace();
  const isOwner = callerRole === "owner";

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-member action error (keyed by userId).
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [busyMember, setBusyMember] = useState<string | null>(null);

  const wsId = workspace.id;

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${wsId}/members`);
    if (!res.ok) throw new Error(await readError(res));
    const data = (await res.json()) as { members: MemberRow[] };
    setMembers(data.members);
  }, [wsId]);

  const loadInvites = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${wsId}/invites`);
    if (!res.ok) throw new Error(await readError(res));
    const data = (await res.json()) as { invites: InviteRow[] };
    setInvites(data.invites);
  }, [wsId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await Promise.all([loadMembers(), loadInvites()]);
      } catch (e) {
        if (active)
          setLoadError(e instanceof Error ? e.message : "Could not load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMembers, loadInvites]);

  const setError = useCallback((userId: string, msg: string | null) => {
    setRowError((prev) => {
      const next = { ...prev };
      if (msg) next[userId] = msg;
      else delete next[userId];
      return next;
    });
  }, []);

  const changeRole = useCallback(
    async (userId: string, newRole: Role) => {
      setBusyMember(userId);
      setError(userId, null);
      try {
        const res = await fetch(
          `/api/workspaces/${wsId}/members/${userId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          },
        );
        if (!res.ok) {
          setError(userId, await readError(res));
          return;
        }
        await loadMembers();
      } catch {
        setError(userId, "Could not change role.");
      } finally {
        setBusyMember(null);
      }
    },
    [wsId, loadMembers, setError],
  );

  const removeMember = useCallback(
    async (m: MemberRow) => {
      if (
        !window.confirm(
          `Remove ${m.email} from this workspace? This cannot be undone.`,
        )
      )
        return;
      setBusyMember(m.userId);
      setError(m.userId, null);
      try {
        const res = await fetch(
          `/api/workspaces/${wsId}/members/${m.userId}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          setError(m.userId, await readError(res));
          return;
        }
        await loadMembers();
      } catch {
        setError(m.userId, "Could not remove member.");
      } finally {
        setBusyMember(null);
      }
    },
    [wsId, loadMembers, setError],
  );

  if (loading) {
    return (
      <p className="font-sans text-sm text-ink-muted">Loading members…</p>
    );
  }

  if (loadError) {
    return (
      <p className="rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {/* Members table */}
      <section>
        <h2 className="mb-3 font-sans text-sm font-semibold tracking-carbon text-ink">
          Members
        </h2>
        <div className="border border-hairline bg-canvas">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-sans text-[11px] uppercase tracking-wider text-ink-subtle">
                  Member
                </th>
                <th className="px-4 py-3 font-sans text-[11px] uppercase tracking-wider text-ink-subtle">
                  Role
                </th>
                <th className="px-4 py-3 text-right font-sans text-[11px] uppercase tracking-wider text-ink-subtle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const busy = busyMember === m.userId;
                return (
                  <tr
                    key={m.userId}
                    className="border-b border-hairline last:border-0 align-top"
                  >
                    <td className="px-4 py-3">
                      <div className="font-sans text-sm text-ink">
                        {m.name ?? m.email}
                      </div>
                      {m.name && (
                        <div className="font-mono text-[11px] text-ink-subtle">
                          {m.email}
                        </div>
                      )}
                      {rowError[m.userId] && (
                        <div className="mt-1 font-sans text-xs text-error">
                          {rowError[m.userId]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        disabled={busy}
                        onChange={(e) =>
                          changeRole(m.userId, e.target.value as Role)
                        }
                        className="rounded-none border border-hairline bg-surface-1 px-3 py-2 font-sans text-sm text-ink outline-none transition-colors focus:border-ibm-blue disabled:opacity-50"
                      >
                        {ALL_ROLES.map((r) => (
                          <option
                            key={r}
                            value={r}
                            // Only owners may grant the owner role; mirror the
                            // server guard so the option reads as unavailable.
                            disabled={r === "owner" && !isOwner}
                          >
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeMember(m)}
                        disabled={busy}
                        className="cds-btn cds-btn--ghost cds-btn--sm text-error disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite section */}
      <InviteSection
        workspaceId={wsId}
        onInvited={loadInvites}
        invites={invites}
        onRevoke={loadInvites}
      />
    </div>
  );
}

/** Invite form + pending-invite list. Split out to keep state localized. */
function InviteSection({
  workspaceId,
  invites,
  onInvited,
  onRevoke,
}: {
  workspaceId: string;
  invites: InviteRow[];
  onInvited: () => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const sendInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSending(true);
      setError(null);
      setInviteUrl(null);
      setCopied(false);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        });
        const data = (await res.json()) as {
          error?: string;
          inviteUrl?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Could not send invite.");
          return;
        }
        setInviteUrl(data.inviteUrl ?? null);
        setEmail("");
        await onInvited();
      } catch {
        setError("Could not send invite.");
      } finally {
        setSending(false);
      }
    },
    [workspaceId, email, role, onInvited],
  );

  const revoke = useCallback(
    async (inviteId: string) => {
      setBusyInvite(inviteId);
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/invites/${inviteId}`,
          { method: "DELETE" },
        );
        if (res.ok) await onRevoke();
      } finally {
        setBusyInvite(null);
      }
    },
    [workspaceId, onRevoke],
  );

  const copyUrl = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      /* clipboard may be unavailable; the field is selectable as a fallback */
    }
  }, [inviteUrl]);

  return (
    <section>
      <h2 className="mb-3 font-sans text-sm font-semibold tracking-carbon text-ink">
        Invite a teammate
      </h2>

      <form
        onSubmit={sendInvite}
        className="flex flex-wrap items-end gap-3 border border-hairline bg-canvas p-4"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            placeholder="teammate@example.com"
            className="w-full rounded-none border border-hairline bg-surface-1 px-4 py-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-ibm-blue"
          />
        </div>
        <div>
          <label className="mb-1 block font-sans text-xs uppercase tracking-wider text-ink-subtle">
            Role
          </label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as Exclude<Role, "owner">)
            }
            disabled={sending}
            className="rounded-none border border-hairline bg-surface-1 px-3 py-3 font-sans text-sm text-ink outline-none transition-colors focus:border-ibm-blue"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="cds-btn cds-btn--primary disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send invite"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
          {error}
        </p>
      )}

      {inviteUrl && (
        <div className="mt-3 border border-hairline bg-surface-1 p-4">
          <p className="mb-2 font-sans text-xs text-ink-muted">
            Email sent (also logged server-side for dev). Share this link:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-none border border-hairline bg-canvas px-3 py-2 font-mono text-xs text-ink outline-none"
            />
            <button
              onClick={copyUrl}
              className="cds-btn cds-btn--tertiary cds-btn--sm whitespace-nowrap"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Pending invites */}
      <h3 className="mb-2 mt-8 font-sans text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Pending invites
      </h3>
      {invites.length === 0 ? (
        <p className="font-sans text-sm text-ink-subtle">
          No pending invites.
        </p>
      ) : (
        <ul className="border border-hairline bg-canvas">
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 last:border-0"
            >
              <div>
                <span className="font-sans text-sm text-ink">
                  {inv.email}
                </span>
                <span className="ml-2 font-mono text-[11px] text-ink-subtle">
                  {ROLE_LABELS[inv.role]}
                </span>
              </div>
              <button
                onClick={() => revoke(inv.id)}
                disabled={busyInvite === inv.id}
                className="cds-btn cds-btn--ghost cds-btn--sm text-error disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
