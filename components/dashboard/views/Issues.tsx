import { ISSUES } from "@/lib/dashboard/mock";
import type { RoleConfig } from "@/lib/dashboard/mock";
import { Tag, Tile, TileHead, ViewHead, RoleBanner } from "../ui";

interface Props {
  role: RoleConfig;
  onDraft: (issueId: string) => void;
}

function sevTag(sev: string) {
  if (sev === "blocking") return <Tag tone="red">Blocking</Tag>;
  if (sev === "major") return <Tag tone="amber">Major</Tag>;
  return <Tag tone="grey">Minor</Tag>;
}

export function Issues({ role, onDraft }: Props) {
  const banner = (
    <RoleBanner html={`Viewing as <b style="color:#0f62fe">${role.label}</b> — ${role.access}`} />
  );

  if (role.issues === "summary") {
    const open = ISSUES.filter((i) => i.status === "open").length;
    return (
      <section>
        <ViewHead
          title="RFIs / Issue Tracker"
          sub="AEMO & NSP issue tracker items · AI-drafted responses grounded in your docs"
          right={banner}
        />
        <Tile>
          <TileHead title="Issue Summary" hint="business view" />
          <div className="flex gap-8">
            <div>
              <div className="cds-display text-4xl text-warning">{open}</div>
              <div className="text-xs text-ink-muted">open issues</div>
            </div>
            <div>
              <div className="cds-display text-4xl text-error">1</div>
              <div className="text-xs text-ink-muted">blocking</div>
            </div>
            <div>
              <div className="cds-display text-4xl text-success">1</div>
              <div className="text-xs text-ink-muted">resolved this round</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Your consultant (PSC Energy) is responding. Est. resolution:{" "}
            <b className="text-ink">~9 days</b>. Technical detail hidden in this view.
          </p>
        </Tile>
      </section>
    );
  }

  let issues = ISSUES;
  if (role.issues === "model-only") issues = ISSUES.filter((i) => i.clause === "S5.2.5.5");

  return (
    <section>
      <ViewHead
        title="RFIs / Issue Tracker"
        sub="AEMO & NSP issue tracker items · AI-drafted responses grounded in your docs"
        right={banner}
      />
      <div>
        {issues.map((i) => (
          <div
            key={i.id}
            className="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border border-hairline bg-canvas p-3"
          >
            <Tag tone={i.src === "AEMO" ? "blue" : "grey"}>{i.src}</Tag>
            <div>
              <div className="text-sm font-semibold tracking-carbon text-ink">
                #{i.id} · {i.title}
              </div>
              <div className="text-xs text-ink-muted">{i.body}</div>
            </div>
            {i.clause !== "—" ? (
              <span className="bg-surface-1 px-2 py-0.5 font-mono text-xs text-ink-muted">
                {i.clause}
              </span>
            ) : (
              <span />
            )}
            {sevTag(i.sev)}
            {i.status === "resolved" ? (
              <Tag tone="green">Resolved</Tag>
            ) : role.canDraft ? (
              <button className="cds-btn cds-btn--tertiary cds-btn--sm" onClick={() => onDraft(i.id)}>
                ✦ Draft response
              </button>
            ) : (
              <Tag tone="amber">Open</Tag>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
