import { MODELS } from "@/lib/dashboard/mock";
import type { AuditReport } from "@/types/report";
import { Tag, ViewHead } from "../ui";

interface Props {
  report: AuditReport | null;
}

export function Models({ report }: Props) {
  const oem = report?.oem_summary ?? null;
  return (
    <section>
      <ViewHead
        title="OEM Model Registry"
        sub="Version-tracked OEM models · cross-project issue propagation"
      />

      {oem && (
        <div className="mb-5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            This submission
          </div>
          <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border border-ibm-blue bg-surface-1 p-3">
            <span className="grid h-9 w-11 place-items-center bg-canvas font-mono text-[10px] font-medium text-ibm-blue">
              OEM
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold tracking-carbon text-ink">
                {oem.vendor ?? "Unknown vendor"}
                {oem.model_name ? ` · ${oem.model_name}` : ""}
                {oem.firmware_version && (
                  <span className="bg-canvas px-2 py-0.5 font-mono text-xs text-ink-muted">
                    {oem.firmware_version}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-muted">
                DMAT baseline {oem.dmat_baseline_version ?? "not declared"} · parsed from this audit&apos;s OEM metadata
              </div>
            </div>
            <Tag tone="blue">live</Tag>
          </div>
        </div>
      )}

      <div>
        {MODELS.map((m, i) => (
          <div
            key={i}
            className="mb-2 grid grid-cols-[44px_1fr_auto] items-center gap-3 border border-hairline bg-canvas p-3"
          >
            <span className="grid h-9 w-11 place-items-center bg-surface-1 font-mono text-[10px] font-medium text-ink-muted">
              OEM
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold tracking-carbon text-ink">
                {m.name}
                <span className="bg-surface-1 px-2 py-0.5 font-mono text-xs text-ink-muted">
                  {m.ver}
                </span>
              </div>
              <div className="text-xs text-ink-muted">{m.note}</div>
            </div>
            <Tag tone={m.tone}>{m.status}</Tag>
          </div>
        ))}
      </div>
    </section>
  );
}
