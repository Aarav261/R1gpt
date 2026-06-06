export function MissingEvidence({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-accent-green/40 bg-accent-green/5 p-4 font-sans text-sm text-accent-green">
        No missing evidence detected — all checked artefacts are present.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-3"
        >
          <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-accent-red" />
          <div className="flex-1">
            <span className="font-mono text-xs text-text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>{" "}
            <span className="font-sans text-sm text-text-primary">{item}</span>
            <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Required for submission
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
