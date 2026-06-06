/**
 * Renders the ordered rectification plan. Each recommended action string is
 * suffixed by the builder with " [FINDING-ID · effort]", which we parse out to
 * render a finding reference and effort badge.
 */
const EFFORT_STYLE: Record<string, string> = {
  hours: "text-success border-success/40",
  days: "text-ibm-blue border-ibm-blue/40",
  weeks: "text-warning border-warning/40",
  months: "text-error border-error/40",
};

function parseAction(raw: string): {
  action: string;
  finding: string | null;
  effort: string | null;
} {
  const m = raw.match(/^(.*)\s\[([^·\]]+)·\s*([^\]]+)\]\s*$/);
  if (!m) return { action: raw, finding: null, effort: null };
  return {
    action: m[1].trim(),
    finding: m[2].trim(),
    effort: m[3].trim(),
  };
}

export function RectificationPlan({ actions }: { actions: string[] }) {
  if (actions.length === 0) {
    return (
      <p className="rounded-none border border-hairline bg-surface-1 p-4 font-sans text-sm text-ink-subtle">
        No rectification actions required.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {actions.map((raw, i) => {
        const { action, finding, effort } = parseAction(raw);
        return (
          <li
            key={i}
            className="flex items-start gap-3 rounded-none border border-hairline bg-surface-1 p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-surface-2 font-mono text-xs font-semibold text-ink-muted">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="font-sans text-sm text-ink">{action}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {finding && (
                  <span className="font-mono text-[11px] text-ink-subtle">
                    {finding}
                  </span>
                )}
                {effort && (
                  <span
                    className={`rounded-none border px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wider ${
                      EFFORT_STYLE[effort] ?? "text-ink-subtle border-hairline"
                    }`}
                  >
                    {effort}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
