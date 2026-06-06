import { MODELS } from "@/lib/dashboard/mock";
import { Tag, ViewHead } from "../ui";

export function Models() {
  return (
    <section>
      <ViewHead
        title="OEM Model Registry"
        sub="Version-tracked OEM models · cross-project issue propagation"
      />
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
