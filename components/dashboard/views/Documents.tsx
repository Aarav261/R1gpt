import { DOCS } from "@/lib/dashboard/mock";
import type { DocRecord, RoleConfig, RoleKey } from "@/lib/dashboard/mock";
import { Tag, ViewHead, RoleBanner } from "../ui";

interface Props {
  role: RoleConfig;
  roleKey: RoleKey;
  selectedDoc: string | null;
  onSelect: (id: string) => void;
}

const DELTA_KIND: Record<string, { bar: string; bg: string }> = {
  mod: { bar: "#f1c21b", bg: "#fcf4d6" },
  add: { bar: "#24a148", bg: "#defbe6" },
  del: { bar: "#da1e28", bg: "#fff1f1" },
};

function DeltaPanel({ doc, roleKey }: { doc: DocRecord; roleKey: RoleKey }) {
  return (
    <div className="cds-tile self-start lg:sticky lg:top-0">
      <div className="border-b border-hairline px-4 py-3.5">
        <div className="text-sm font-semibold tracking-carbon text-ink">
          {doc.delta ? `What changed → ${doc.ver}` : `${doc.name} · ${doc.ver}`}
        </div>
        <div className="mt-1 text-xs text-ink-muted">
          {doc.delta ? doc.delta.when : "No prior version — first upload."}
        </div>
      </div>
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-3">
        {!doc.delta ? (
          <div className="border border-dashed border-hairline px-4 py-3.5 text-center text-xs text-ink-subtle">
            Nothing to compare yet.
          </div>
        ) : (
          doc.delta.groups.map((g, gi) => (
            <div key={gi} className="mb-3.5 last:mb-0">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {g.label}
              </div>
              {g.items.map((it, ii) => (
                <div
                  key={ii}
                  className="mb-1.5 border-l-2 px-2.5 py-2 text-xs leading-relaxed text-ink"
                  style={{
                    borderColor: DELTA_KIND[g.kind].bar,
                    background: DELTA_KIND[g.kind].bg,
                  }}
                >
                  <span className="mb-0.5 block text-[10px] font-semibold text-ink-muted">
                    {it.clause}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: it.text }} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t border-hairline px-4 py-3">
        <button className="cds-btn cds-btn--tertiary cds-btn--sm">View full document</button>
        {roleKey === "aemo" && (
          <button className="cds-btn cds-btn--primary cds-btn--sm">Mark reviewed</button>
        )}
      </div>
    </div>
  );
}

export function Documents({ role, roleKey, selectedDoc, onSelect }: Props) {
  let docs = DOCS;
  if (role.docs === "models") docs = DOCS.filter((d) => ["pscad", "psse"].includes(d.id));
  if (role.docs === "summary") docs = DOCS.filter((d) => !["pscad", "psse"].includes(d.id));

  const active = docs.find((d) => d.id === selectedDoc) ?? null;

  return (
    <section>
      <ViewHead
        title="Documents"
        sub="Versioned repository · click a document to see what changed"
        right={<RoleBanner html={`Viewing as <b style="color:#0f62fe">${role.label}</b> — ${role.access}`} />}
      />
      <div className={`grid gap-4 ${active ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
        <div>
          {docs.map((d) => {
            const isSel = selectedDoc === d.id;
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d.id)}
                className={`mb-2 grid w-full grid-cols-[44px_1fr_auto_auto] items-center gap-3 border p-3 text-left transition-colors ${
                  isSel
                    ? "border-ibm-blue bg-surface-1"
                    : "border-hairline bg-canvas hover:bg-surface-1"
                }`}
              >
                <span className="grid h-9 w-11 place-items-center bg-surface-1 font-mono text-[10px] font-medium text-ink-muted">
                  {d.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-carbon text-ink">{d.name}</span>
                  <span className="block text-xs text-ink-muted">{d.type}</span>
                </span>
                {d.changed ? <Tag tone="blue">changed</Tag> : <Tag tone="grey">stable</Tag>}
                <span
                  className={`px-2 py-0.5 font-mono text-xs tabular-nums ${
                    d.changed ? "bg-[#d0e2ff] text-[#002d9c]" : "bg-surface-1 text-ink-muted"
                  }`}
                >
                  {d.ver}
                </span>
              </button>
            );
          })}
        </div>
        {active && <DeltaPanel doc={active} roleKey={roleKey} />}
      </div>
    </section>
  );
}
