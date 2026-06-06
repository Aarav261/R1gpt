export function DocumentTag({
  required,
}: {
  required: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-none px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-wider ${
        required
          ? "bg-[#d0e2ff] text-[#002d9c]"
          : "bg-surface-2 text-ink-subtle"
      }`}
    >
      {required ? "REQUIRED" : "OPTIONAL"}
    </span>
  );
}
