"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ROLES,
  PROJECT,
  AUDIT,
  DOCS,
  ISSUES,
  ACTIVITY,
  DRAFTS,
  type RoleKey,
  type AuditItem,
} from "@/lib/dashboard/mock";
import {
  runDemoAudit,
  reportToAuditItems,
  reportToDocItems,
  reportToIssueItems,
  reportToDrafts,
  reportToActivity,
  type AuditProgress,
} from "@/lib/dashboard/auditClient";
import {
  loadLatestReportSync,
  fetchLatestReport,
  saveLatestReport,
} from "@/lib/dashboard/reportState";
import type { AuditReport } from "@/types/report";
import { Overview } from "./views/Overview";
import { Documents } from "./views/Documents";
import { Audit } from "./views/Audit";
import { Issues } from "./views/Issues";
import { Models } from "./views/Models";
import { Intelligence } from "./views/Intelligence";
import { AiDrawer } from "./AiDrawer";

type ViewKey = "overview" | "documents" | "audit" | "issues" | "models" | "intel";
type NavItem = { key: ViewKey; label: string; badge?: string; tone?: "red" | "amber" };

export function Dashboard() {
  const [view, setView] = useState<ViewKey>("overview");
  const [roleKey, setRoleKey] = useState<RoleKey>("consultant");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [drawerIssue, setDrawerIssue] = useState<string | null>(null);

  // Live audit state — populated by the real /api/audit pipeline.
  const [liveReport, setLiveReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const role = ROLES[roleKey];

  // Hydrate the latest real audit on mount: sessionStorage first (instant),
  // then the server store as source of truth (covers a fresh tab / reload).
  useEffect(() => {
    const cached = loadLatestReportSync();
    if (cached) setLiveReport(cached);
    fetchLatestReport().then((r) => {
      if (r) setLiveReport(r);
    });
  }, []);

  // ---- Live projections (fall back to static mock when no report yet) ----
  const auditItems: AuditItem[] = useMemo(
    () => (liveReport ? reportToAuditItems(liveReport) : AUDIT),
    [liveReport]
  );
  const docItems = useMemo(
    () => (liveReport ? reportToDocItems(liveReport) : DOCS),
    [liveReport]
  );
  const issueItems = useMemo(
    () => (liveReport ? reportToIssueItems(liveReport) : ISSUES),
    [liveReport]
  );
  const draftMap = useMemo(
    () => (liveReport ? reportToDrafts(liveReport) : DRAFTS),
    [liveReport]
  );
  const activity = useMemo(
    () => (liveReport ? reportToActivity(liveReport) : ACTIVITY),
    [liveReport]
  );

  const projectName = liveReport?.project_name ?? PROJECT.name;
  const blockingCount = auditItems.filter((a) => a.s === "fail").length;
  const openIssues = issueItems.filter((i) => i.status === "open").length;

  // Readiness: live readiness index when available, else mockup baseline.
  const readiness = liveReport
    ? Math.round(liveReport.readiness_index)
    : 72;

  // Sidebar badges reflect live counts once an audit exists.
  const nav: NavItem[] = [
    { key: "overview", label: "Overview" },
    {
      key: "documents",
      label: "Documents",
      badge: liveReport ? String(docItems.length) : "v3.2",
      tone: "amber",
    },
    {
      key: "audit",
      label: "Pre-Submission Audit",
      badge: blockingCount > 0 ? String(blockingCount) : undefined,
      tone: "red",
    },
    {
      key: "issues",
      label: "RFIs / Issues",
      badge: openIssues > 0 ? String(openIssues) : undefined,
      tone: "red",
    },
    { key: "models", label: "OEM Models" },
  ];

  // Resolve the drawer's issue + AI draft from whichever issue set is active.
  const activeIssue = drawerIssue
    ? issueItems.find((i) => i.id === drawerIssue) ?? null
    : null;
  const activeDraft = drawerIssue ? draftMap[drawerIssue] ?? null : null;

  function selectDoc(id: string) {
    setSelectedDoc((cur) => (cur === id ? null : id));
  }

  function selectRole(r: RoleKey) {
    setRoleKey(r);
    setSelectedDoc(null);
  }

  async function runAudit() {
    setRunning(true);
    setAuditError(null);
    setProgress(null);
    try {
      const report = await runDemoAudit(setProgress);
      setLiveReport(report);
      saveLatestReport(report);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="grid h-screen grid-cols-[230px_1fr] grid-rows-[48px_1fr] overflow-hidden">
      {/* Top bar */}
      <header className="col-span-2 flex items-center justify-between border-b border-hairline bg-canvas px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center bg-ibm-blue text-xs font-semibold text-white">
            R1
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-carbon text-ink">R1GPT</div>
            <div className="-mt-0.5 text-[11px] text-ink-subtle">Connection Approval Workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-ink-subtle">Viewing as</label>
            <select
              value={roleKey}
              onChange={(e) => selectRole(e.target.value as RoleKey)}
              className="border border-hairline bg-surface-1 px-2 py-1.5 text-xs font-semibold tracking-carbon text-ink outline-none focus:border-ibm-blue"
            >
              <option value="consultant">Power Systems Consultant</option>
              <option value="proponent">Proponent / Developer</option>
              <option value="oem">OEM (Sungrow)</option>
              <option value="nsp">NSP (Transgrid)</option>
              <option value="aemo">AEMO Reviewer</option>
            </select>
          </div>
          <Link href="/upload" className="cds-btn cds-btn--primary cds-btn--sm">
            + New audit
          </Link>
          <div className="relative grid h-8 w-8 place-items-center border border-hairline bg-canvas">
            <span className="text-sm">🔔</span>
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-error" />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="flex flex-col gap-1 overflow-y-auto border-r border-hairline bg-canvas px-2.5 py-3.5">
        <div className="mb-3 border border-hairline bg-surface-1 p-3">
          <div className="text-sm font-semibold tracking-carbon text-ink">{projectName}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            {PROJECT.meta1}
            <br />
            {PROJECT.meta2}
          </div>
          <span className="mt-2 inline-block bg-[#fcf4d6] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#684e00]">
            {liveReport ? `READINESS ${readiness}/100 · ${liveReport.materiality_class.toUpperCase()}` : PROJECT.tag}
          </span>
        </div>

        <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          Project
        </div>
        {nav.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? "border-ibm-blue bg-surface-1 font-semibold text-ink"
                  : "border-transparent text-ink-muted hover:bg-surface-1 hover:text-ink"
              }`}
            >
              <span className="flex-1 tracking-carbon">{n.label}</span>
              {n.badge && (
                <span
                  className={`px-1.5 text-[10px] font-semibold ${
                    n.tone === "amber"
                      ? "bg-[#fcf4d6] text-[#684e00]"
                      : "bg-[#ffd7d9] text-[#a2191f]"
                  }`}
                >
                  {n.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          Network
        </div>
        <button
          onClick={() => setView("intel")}
          className={`flex items-center gap-2 border-l-2 px-3 py-2 text-left text-sm opacity-60 transition-colors ${
            view === "intel"
              ? "border-ibm-blue bg-surface-1 font-semibold text-ink"
              : "border-transparent text-ink-muted hover:bg-surface-1"
          }`}
        >
          <span className="flex-1 tracking-carbon">Shared Intelligence</span>
          <span className="bg-surface-2 px-1.5 text-[10px] text-ink-muted">🔒</span>
        </button>
      </aside>

      {/* Main */}
      <main className="overflow-y-auto bg-canvas px-6 py-5">
        {view === "overview" && (
          <Overview
            role={role}
            readiness={readiness}
            blockingCount={blockingCount}
            live={!!liveReport}
            projectName={projectName}
            activity={activity}
          />
        )}
        {view === "documents" && (
          <Documents
            role={role}
            roleKey={roleKey}
            docs={docItems}
            selectedDoc={selectedDoc}
            onSelect={selectDoc}
          />
        )}
        {view === "audit" && (
          <Audit
            items={auditItems}
            live={liveReport}
            running={running}
            progress={progress}
            error={auditError}
            onRun={runAudit}
          />
        )}
        {view === "issues" && <Issues role={role} issues={issueItems} onDraft={setDrawerIssue} />}
        {view === "models" && <Models report={liveReport} />}
        {view === "intel" && <Intelligence />}
      </main>

      <AiDrawer issue={activeIssue} draft={activeDraft} onClose={() => setDrawerIssue(null)} />
    </div>
  );
}
