"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuditReport, Severity } from "@/types/report";
import { ApprovalMeter } from "@/components/audit/ApprovalMeter";
import { DifferentiatorCallout } from "@/components/audit/DifferentiatorCallout";
import { ClauseScorecard } from "@/components/audit/ClauseScorecard";
import { FindingsList } from "@/components/audit/FindingsList";
import { MissingEvidence } from "@/components/audit/MissingEvidence";
import { PredictedRFIs } from "@/components/audit/PredictedRFIs";
import { RectificationPlan } from "@/components/audit/RectificationPlan";
import { TimelineEstimate } from "@/components/audit/TimelineEstimate";
import { SkeletonReport } from "@/components/ui/SkeletonLoader";

const SECTIONS = [
  { id: "verdict", label: "Approval verdict" },
  { id: "scorecard", label: "Clause scorecard" },
  { id: "findings", label: "Findings" },
  { id: "missing", label: "Missing evidence" },
  { id: "rfis", label: "Predicted RFIs" },
  { id: "rectification", label: "Rectification plan" },
  { id: "timeline", label: "Timeline" },
];

function SectionHeading({ id, n, title }: { id: string; n: number; title: string }) {
  return (
    <div id={id} className="mb-4 scroll-mt-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-text-muted">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-sans text-xl font-semibold text-text-primary">
          {title}
        </h2>
      </div>
      <div className="mt-2 h-px bg-border" />
    </div>
  );
}

export default function AuditReportPage({
  params,
}: {
  params: { auditId: string };
}) {
  const { auditId } = params;
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefer the report streamed into sessionStorage during the audit run;
    // fall back to the server store via GET for direct navigation / refresh.
    let cached: AuditReport | null = null;
    try {
      const raw = sessionStorage.getItem(`r1gpt:${auditId}`);
      if (raw) cached = JSON.parse(raw) as AuditReport;
    } catch {
      /* ignore */
    }
    if (cached) {
      setReport(cached);
      return;
    }
    fetch(`/api/audit/${auditId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Report not found.");
        return res.json();
      })
      .then((data: AuditReport) => setReport(data))
      .catch(() => setError("Report not found. It may have expired — re-run the audit."));
  }, [auditId]);

  const counts = useMemo(() => {
    const f = report?.findings ?? [];
    return {
      total: f.length,
      dmat: f.filter((x) => x.severity === Severity.DMAT_TRIGGERING).length,
      high: f.filter((x) => x.severity === Severity.HIGH).length,
    };
  }, [report]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="font-mono text-sm text-accent-red">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block font-mono text-sm text-accent-blue hover:underline"
        >
          ← Back to upload
        </Link>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <SkeletonReport />
      </main>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 py-8">
      {/* Sidebar */}
      <aside className="sticky top-8 hidden h-fit w-[240px] shrink-0 lg:block">
        <Link
          href="/"
          className="font-mono text-xs text-text-muted hover:text-text-secondary"
        >
          ← New audit
        </Link>
        <div className="mt-3 font-mono text-lg font-bold text-text-primary">
          R1GPT
        </div>
        <nav className="mt-4 space-y-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded px-3 py-1.5 font-sans text-sm text-text-secondary transition-colors hover:bg-bg-highlight hover:text-text-primary"
            >
              {s.label}
              {s.id === "findings" && ` (${counts.total})`}
            </a>
          ))}
        </nav>
        <div className="mt-6 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-text-muted">
          Audited against PSMG v3.0
          <br />
          Effective 25 September 2025
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 space-y-12">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border bg-bg-surface px-2 py-0.5 font-mono text-[11px] text-accent-purple">
              PSMG v3.0
            </span>
            <span className="font-mono text-xs text-text-muted">
              {report.audit_id}
            </span>
          </div>
          <h1 className="mt-2 font-sans text-2xl font-bold text-text-primary">
            {report.project_name}
          </h1>
          <p className="font-mono text-xs text-text-muted">
            {new Date(report.timestamp).toLocaleString()}
          </p>
        </header>

        {/* 1 — Approval verdict */}
        <section>
          <SectionHeading id="verdict" n={1} title="Approval verdict" />
          <div className="rounded-lg border border-border bg-bg-surface p-6">
            <ApprovalMeter
              probability={report.approval_probability}
              confidenceInterval={report.confidence_interval}
              materialityClass={report.materiality_class}
            />
          </div>
          <div className="mt-4">
            <DifferentiatorCallout
              findingCount={counts.total}
              dmatCount={counts.dmat}
              highCount={counts.high}
              probability={report.approval_probability}
            />
          </div>
        </section>

        {/* 2 — Clause scorecard */}
        <section>
          <SectionHeading id="scorecard" n={2} title="Clause scorecard" />
          <ClauseScorecard scorecard={report.clause_scorecard} />
        </section>

        {/* 3 — Findings */}
        <section>
          <SectionHeading id="findings" n={3} title={`Findings (${counts.total})`} />
          <FindingsList findings={report.findings} />
        </section>

        {/* 4 — Missing evidence */}
        <section>
          <SectionHeading id="missing" n={4} title="Missing evidence" />
          <MissingEvidence items={report.missing_evidence} />
        </section>

        {/* 5 — Predicted RFIs */}
        <section>
          <SectionHeading id="rfis" n={5} title="Predicted AEMO / NSP RFIs" />
          <PredictedRFIs questions={report.predicted_rfi_questions} />
        </section>

        {/* 6 — Rectification plan */}
        <section>
          <SectionHeading id="rectification" n={6} title="Rectification plan" />
          <RectificationPlan actions={report.recommended_actions} />
        </section>

        {/* 7 — Timeline */}
        <section>
          <SectionHeading id="timeline" n={7} title="Time to approval" />
          <div className="rounded-lg border border-border bg-bg-surface p-6">
            <TimelineEstimate
              estimate={report.time_to_approval_months}
              findingCount={counts.total}
              dmatCount={counts.dmat}
            />
          </div>
        </section>

        <footer className="border-t border-border pt-4 font-mono text-[11px] text-text-muted">
          R1GPT · Audited against AEMO Power System Model Guidelines v3.0 ·
          Effective 25 September 2025
        </footer>
      </main>
    </div>
  );
}
