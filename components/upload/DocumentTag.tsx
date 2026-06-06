export function DocumentTag({
  required,
}: {
  required: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${
        required
          ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/40"
          : "bg-bg-highlight text-text-muted border border-border"
      }`}
    >
      {required ? "REQUIRED" : "OPTIONAL"}
    </span>
  );
}
