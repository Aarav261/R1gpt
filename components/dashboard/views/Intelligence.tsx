import { ViewHead } from "../ui";

const CARDS = [
  { title: "Predicted AEMO Questions", body: "By tech · region · GPS clause" },
  { title: "Failure Taxonomy", body: "Ranked rejection causes" },
  { title: "Resolution Playbooks", body: "What actually closed it out" },
];

export function Intelligence() {
  return (
    <section>
      <ViewHead
        title="Shared Intelligence Layer"
        sub="Cross-project, de-identified — the moat. Unlocks as projects complete R1."
      />
      <div className="border border-dashed border-hairline bg-canvas px-7 py-8 text-center">
        <div className="text-2xl">🔒</div>
        <h3 className="mt-2 text-xl font-normal text-ink">Unlocks at 20 completed R1 projects</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
          Predicted AEMO questions, failure taxonomy, resolution playbooks, materiality signals
          and timeline benchmarks — drawn from the resolved history of every comparable project,
          de-identified.
        </p>
        <div className="mx-auto mt-3.5 h-2 max-w-xs bg-surface-2">
          <div className="h-2 bg-ibm-blue" style={{ width: "35%" }} />
        </div>
        <div className="mt-1.5 text-xs text-ink-subtle">7 of 20 seed projects loaded</div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-left opacity-60 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.title} className="border border-hairline bg-canvas p-4">
              <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
              <div className="mt-1 text-xs text-ink-muted">{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
