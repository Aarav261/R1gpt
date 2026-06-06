import type { ReactNode } from "react";
import type { TagTone } from "@/lib/dashboard/mock";

const TONE_CLASS: Record<TagTone, string> = {
  blue: "cds-tag--blue",
  green: "cds-tag--green",
  amber: "cds-tag--amber",
  red: "cds-tag--red",
  grey: "cds-tag--grey",
};

export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`cds-tag ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function Tile({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`cds-tile p-6 ${className}`}>{children}</div>;
}

export function TileHead({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-carbon text-ink">{title}</h3>
      {hint ? (
        <span className="text-xs font-normal text-ink-subtle">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * Carbon-style progress meter. Carbon resists decorative rings on data
 * surfaces, so readiness is shown as a flat percentage with a square track.
 */
export function ReadinessMeter({
  value,
  tone = "success",
}: {
  value: number;
  tone?: "success" | "warning" | "error";
}) {
  const color =
    tone === "error" ? "#da1e28" : tone === "warning" ? "#f1c21b" : "#24a148";
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="cds-display text-5xl text-ink">{value}</span>
        <span className="text-sm text-ink-muted">/ 100</span>
      </div>
      <div className="mt-3 h-2 w-full bg-surface-2">
        <div
          className="h-2 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function ViewHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="cds-display text-[32px] leading-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{sub}</p>
      </div>
      {right}
    </div>
  );
}

export function RoleBanner({ html }: { html: string }) {
  return (
    <div
      className="border border-hairline bg-surface-1 px-3 py-1.5 text-xs text-ink-muted"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
