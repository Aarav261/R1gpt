"use client";

import { useEffect, useState } from "react";
import type { IssueRecord } from "@/lib/dashboard/mock";

interface Props {
  issue: IssueRecord | null;
  draft: string | null;
  onClose: () => void;
}

// Renders the AI source-citation spans (<span class="ai-src">…</span>) as Carbon
// inline blue chips. Everything else is escaped, then we re-inject the chips.
function renderDraft(raw: string): string {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Bring back the citation markers we just escaped.
  return escaped.replace(
    /&lt;span class="ai-src"&gt;(.*?)&lt;\/span&gt;/g,
    '<span style="background:#d0e2ff;color:#002d9c;padding:1px 6px;font-size:11px;border-radius:2px;white-space:nowrap;">$1</span>'
  );
}

export function AiDrawer({ issue, draft, onClose }: Props) {
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    if (!issue) return;
    setTyped(false);
    const t = setTimeout(() => setTyped(true), 550);
    return () => clearTimeout(t);
  }, [issue]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          issue ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col border-l border-hairline bg-canvas transition-transform duration-200 ${
          issue ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="text-base font-semibold tracking-carbon text-ink">✦ AI Response Copilot</h3>
          <button className="text-xl text-ink-muted hover:text-ink" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {issue && (
            <>
              <div className="mb-3.5 flex items-center gap-2 bg-surface-1 px-3 py-2 text-xs text-ink-muted">
                ✦ Grounded in this project&apos;s documents + NER source text. Every claim is cited.
                You review before lodging.
              </div>
              <div className="mb-1.5 text-xs text-ink-muted">
                <b className="text-ink">
                  Responding to {issue.src} #{issue.id}
                </b>{" "}
                · {issue.clause}
              </div>
              <div className="mb-3.5 bg-surface-1 px-3 py-2.5 text-xs text-ink">{issue.body}</div>
              <div className="border border-hairline bg-canvas p-3.5 text-sm leading-relaxed text-ink">
                {!typed ? (
                  <span className="italic text-ink-subtle">Drafting response…</span>
                ) : (
                  <pre
                    className="whitespace-pre-wrap font-sans"
                    dangerouslySetInnerHTML={{
                      __html: renderDraft(draft || "Draft unavailable for this item."),
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-hairline px-5 py-3.5">
          <button
            className="cds-btn cds-btn--primary"
            onClick={() =>
              alert("Draft inserted into RFI response — engineer review required before lodgement.")
            }
          >
            Insert &amp; Review
          </button>
          <button className="cds-btn cds-btn--tertiary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </aside>
    </>
  );
}
