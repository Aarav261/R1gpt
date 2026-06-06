/**
 * Renders the ordered rectification plan. Each recommended action string is
 * suffixed by the builder with " [FINDING-ID · effort]", which we parse out to
 * render a finding reference and effort badge.
 */
const EFFORT_STYLE: Record<string, string> = {
  hours: "text-accent-green border-accent-green/40",
  days: "text-accent-blue border-accent-blue/40",
  weeks: "text-accent-amber border-accent-amber/40",
  months: "text-accent-red border-accent-red/40",
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
      <p className="rounded-lg border border-border bg-bg-surface p-4 font-sans text-sm text-text-muted">
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
            className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-highlight font-mono text-xs font-semibold text-text-secondary">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="font-sans text-sm text-text-primary">{action}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {finding && (
                  <span className="font-mono text-[11px] text-text-muted">
                    {finding}
                  </span>
                )}
                {effort && (
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                      EFFORT_STYLE[effort] ?? "text-text-muted border-border"
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
