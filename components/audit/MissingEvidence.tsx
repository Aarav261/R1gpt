export function MissingEvidence({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-none border border-success/40 bg-success/5 p-4 font-sans text-sm text-success">
        No missing evidence detected — all checked artefacts are present.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-none border border-hairline bg-surface-1 p-3"
        >
          <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-error" />
          <div className="flex-1">
            <span className="font-mono text-xs text-ink-subtle">
              {String(i + 1).padStart(2, "0")}
            </span>{" "}
            <span className="font-sans text-sm text-ink">{item}</span>
            <div className="mt-0.5 font-sans text-[11px] uppercase tracking-wider text-ink-subtle">
              Required for submission
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
