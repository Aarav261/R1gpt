import { ACTIVITY, PIPELINE } from "@/lib/dashboard/mock";
import type { RoleConfig, ActivityRecord } from "@/lib/dashboard/mock";
import { Tag, Tile, TileHead, ReadinessMeter, ViewHead, RoleBanner } from "../ui";

interface Props {
  role: RoleConfig;
  readiness: number;
  blockingCount: number;
  live: boolean;
  projectName: string;
  activity: ActivityRecord[];
}

export function Overview({ role, readiness, blockingCount, live, projectName, activity }: Props) {
  const tone = blockingCount > 0 ? "error" : readiness >= 90 ? "success" : "warning";
  return (
    <section>
      <ViewHead
        title="Project Overview"
        sub={`${projectName} · Connection approval status & pipeline`}
        right={<RoleBanner html={`Viewing as <b style="color:#0f62fe">${role.label}</b> — ${role.access}`} />}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Tile>
          <TileHead
            title="Submission Readiness"
            hint={live ? "live audit" : "pre-lodgement"}
          />
          <ReadinessMeter value={readiness} tone={tone} />
          <div className="mt-3 text-xs text-ink-muted">
            {blockingCount > 0 ? (
              <span className="flex items-center gap-2">
                <Tag tone="red">{blockingCount} blocking items</Tag> Clear blockers to reach 90%+
              </span>
            ) : (
              <Tag tone="green">No blocking items</Tag>
            )}
          </div>
        </Tile>

        <Tile>
          <TileHead title="Time in Stage" hint="TDD Round 2" />
          <div className="flex items-baseline gap-2">
            <span className="cds-display text-5xl text-ink">23</span>
            <span className="text-sm text-ink-muted">days</span>
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            vs benchmark 18 days for grid-forming BESS
          </div>
          <div className="mt-3">
            <Tag tone="amber">5 days over benchmark</Tag>
          </div>
        </Tile>

        <Tile>
          <TileHead title="AEMO 60-Day Clock" hint="status notification" />
          <div className="flex items-baseline gap-2">
            <span className="cds-display text-5xl text-ink">41</span>
            <span className="text-sm text-ink-muted">days left</span>
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            Statutory notification due 17 Jul 2026
          </div>
          <div className="mt-3">
            <Tag tone="green">On track</Tag>
          </div>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Tile>
          <TileHead title="Connection Pipeline" hint="6-stage AEMO process" />
          <ol className="relative">
            {PIPELINE.map((s, i) => (
              <li
                key={s.name}
                className="relative grid grid-cols-[20px_1fr_auto] items-start gap-3 pb-5 last:pb-0"
              >
                {i < PIPELINE.length - 1 && (
                  <span
                    className="absolute left-[9px] top-6 bottom-0 w-px"
                    style={{ background: s.state === "done" ? "#24a148" : "#e0e0e0" }}
                  />
                )}
                <span
                  className="z-10 mt-0.5 grid h-5 w-5 place-items-center text-[10px] font-semibold"
                  style={
                    s.state === "done"
                      ? { background: "#24a148", color: "#fff" }
                      : s.state === "active"
                        ? { background: "#0f62fe", color: "#fff" }
                        : { background: "#e0e0e0", color: "#8c8c8c" }
                  }
                >
                  {s.state === "done" ? "✓" : s.state === "active" ? "●" : "○"}
                </span>
                <div>
                  <div className="text-sm font-semibold tracking-carbon text-ink">{s.name}</div>
                  <div className="text-xs text-ink-muted">{s.meta}</div>
                </div>
                <div className="whitespace-nowrap text-xs text-ink-subtle">{s.when}</div>
              </li>
            ))}
          </ol>
        </Tile>

        <Tile>
          <TileHead title="Recent Activity" hint={live ? "live audit" : undefined} />
          <div>
            {(activity.length > 0 ? activity : ACTIVITY).map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-hairline py-2.5 last:border-b-0"
              >
                <Tag tone={a.tone}>{a.who}</Tag>
                <div className="flex-1 text-xs text-ink">
                  {a.txt}
                  <div className="mt-0.5 text-xs text-ink-subtle">
                    {a.when === "now" ? "just now" : `${a.when} ago`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  );
}
