/**
 * Small badge rendering a PSMG section reference, e.g. "PSMG §4.6.1".
 * Accepts either a short section ("4.6.1") or a full psmg_ref string
 * ("Section 4.6.1 — Harmonic emissions") and normalises it.
 */
export function PsmgBadge({ refText }: { refText: string | null }) {
  if (!refText) return null;

  // Extract the first "Section X.Y.Z" occurrence; fall back to raw text.
  const match = refText.match(/Section\s+([0-9]+(?:\.[0-9]+)*)/i);
  const section = match ? match[1] : refText.replace(/^Section\s+/i, "");

  return (
    <span
      title={refText}
      className="inline-flex items-center rounded-none bg-[#d0e2ff] px-2 py-0.5 font-mono text-[11px] font-medium text-[#002d9c]"
    >
      PSMG §{section}
    </span>
  );
}
