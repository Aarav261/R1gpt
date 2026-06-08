"use client";

import { useEffect, useMemo, useState } from "react";

export type NotifTone = "red" | "amber" | "blue" | "green";

export interface Notification {
  id: string;
  tone: NotifTone;
  title: string;
  body: string;
  when?: string;
  /** Dashboard view to open when the notification is clicked. */
  view: "overview" | "documents" | "audit" | "issues" | "models" | "intel";
}

const DOT: Record<NotifTone, string> = {
  red: "bg-error",
  amber: "bg-[#f1c21b]",
  blue: "bg-ibm-blue",
  green: "bg-[#24a148]",
};

export function NotificationBell({
  notifications,
  storageKey,
  onOpenView,
}: {
  notifications: Notification[];
  /** Namespacing key (e.g. workspace id) so read-state is per workspace. */
  storageKey: string;
  onOpenView: (view: Notification["view"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Hydrate read-state from sessionStorage so the dot stays cleared on reload.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`notif-read:${storageKey}`);
      if (raw) setReadIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function persist(ids: Set<string>) {
    setReadIds(ids);
    try {
      sessionStorage.setItem(`notif-read:${storageKey}`, JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
  }

  const unread = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the panel marks everything currently shown as read.
    if (next && unread > 0) {
      persist(new Set(notifications.map((n) => n.id)));
    }
  }

  function handleClick(n: Notification) {
    onOpenView(n.view);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative grid h-8 w-8 place-items-center border border-hairline bg-canvas transition-colors hover:bg-surface-1"
      >
        <span className="text-sm">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[9px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[340px] border border-hairline bg-canvas shadow-lg">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink">
                Notifications
              </span>
              <span className="text-[11px] text-ink-subtle">{notifications.length} total</span>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-ink-subtle">
                  You&apos;re all caught up.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className="flex w-full gap-2.5 border-b border-hairline px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-1"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[n.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                        {n.body}
                      </span>
                      {n.when && (
                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-ink-subtle">
                          {n.when}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
