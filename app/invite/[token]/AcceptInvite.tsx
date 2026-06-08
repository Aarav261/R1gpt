"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Join button for a valid invite whose email matches the signed-in user.
 * POSTs to the accept route, then routes into the joined workspace.
 */
export default function AcceptInvite({
  token,
  workspaceName,
}: {
  token: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not accept this invite.");
      setSubmitting(false);
      return;
    }

    const data = (await res.json()) as { workspaceSlug: string };
    router.push(`/w/${data.workspaceSlug}/welcome`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-none border border-error/40 bg-error/10 px-4 py-2 font-sans text-sm text-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onAccept}
        disabled={submitting}
        className="cds-btn cds-btn--primary w-full disabled:opacity-50"
      >
        {submitting ? "Joining…" : `Join ${workspaceName}`}
      </button>
    </div>
  );
}
