import type { AuditReport, Finding, ReportDocument } from "@/types/report";
import { Severity } from "@/types/report";
import { DocumentType } from "@/types/documents";
import type {
  AuditState,
  AuditItem,
  DocRecord,
  DeltaGroup,
  IssueRecord,
  IssueSeverity,
  ActivityRecord,
} from "./mock";

export interface AuditProgress {
  stage: "uploading" | "extracted" | "assessed" | "scored";
  detail: string;
}

interface DemoPayload {
  project_name: string;
  docs: { doc_type: string; filename: string; content: string }[];
}

/**
 * Runs the real R1GPT assessment pipeline against the bundled demo fixtures.
 * Pulls fixtures from /api/demo, posts them to the streaming /api/audit route,
 * and resolves with the finished AuditReport. Requires OPENAI_API_KEY on the
 * server; surfaces a readable error otherwise.
 */
export async function runDemoAudit(
  workspaceId: string,
  projectId: string,
  onProgress?: (p: AuditProgress) => void
): Promise<AuditReport> {
  const demoRes = await fetch("/api/demo");
  if (!demoRes.ok) throw new Error("Failed to load demo fixtures.");
  const demo = (await demoRes.json()) as DemoPayload;

  const form = new FormData();
  form.set("project_name", demo.project_name);
  form.set("workspaceId", workspaceId);
  form.set("projectId", projectId);
  for (const d of demo.docs) {
    const name = d.filename.replace(/\.pdf$/i, ".txt");
    form.set(d.doc_type, new File([d.content], name, { type: "text/plain" }));
  }
  onProgress?.({ stage: "uploading", detail: `${demo.docs.length} documents` });

  const res = await fetch("/api/audit", { method: "POST", body: form });
  if (!res.ok || !res.body) {
    let message = "Audit request failed.";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let report: AuditReport | null = null;

  // The audit route emits newline-delimited JSON: {event, data} per line.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      let msg: { event: string; data: any };
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }

      switch (msg.event) {
        case "extraction_complete":
          onProgress?.({ stage: "extracted", detail: `${msg.data.docCount} documents parsed` });
          break;
        case "assessment_complete":
          onProgress?.({ stage: "assessed", detail: `${msg.data.findingCount} findings` });
          break;
        case "scoring_complete":
          onProgress?.({
            stage: "scored",
            detail: `readiness index ${Math.round(msg.data.readiness ?? 0)}/100`,
          });
          break;
        case "report_complete":
          report = msg.data as AuditReport;
          break;
        case "error":
          throw new Error(msg.data?.message || "Audit failed.");
      }
    }
  }

  if (!report) throw new Error("Audit completed without producing a report.");
  return report;
}

// Maps a pipeline Finding severity onto the dashboard's pass/warn/fail tri-state.
export function severityToState(sev: Severity): AuditState {
  switch (sev) {
    case Severity.DMAT_TRIGGERING:
    case Severity.HIGH:
      return "fail";
    case Severity.MEDIUM:
      return "warn";
    default:
      return "pass";
  }
}

// Projects a live AuditReport into the audit-checklist row shape the UI renders.
export function reportToAuditItems(report: AuditReport): AuditItem[] {
  if (report.findings.length === 0) {
    return [
      {
        s: "pass",
        name: "No findings raised",
        d: "The automated assessment surfaced no clause-level issues.",
      },
    ];
  }
  return report.findings.map((f: Finding) => ({
    s: severityToState(f.severity),
    name: f.title,
    d: [f.clause, f.description].filter(Boolean).join(" — "),
  }));
}

// ---------------------------------------------------------------------------
// Live projections — map a real AuditReport into each workspace view's shape.
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DOC_META: Record<string, { icon: string; label: string }> = {
  [DocumentType.GPS_BASELINE]: { icon: "GPS", label: "GPS / 5.3.4A baseline" },
  [DocumentType.FAT_REPORT]: { icon: "FAT", label: "Transformer FAT report" },
  [DocumentType.OEM_METADATA]: { icon: "OEM", label: "OEM model metadata" },
  [DocumentType.PSCAD_REPORT]: { icon: "EMT", label: "PSCAD / EMT study" },
  [DocumentType.CONNECTION_AGREEMENT]: { icon: "CXN", label: "Connection agreement" },
  [DocumentType.RFI_HISTORY]: { icon: "RFI", label: "Prior RFI history" },
};

const MODEL_DOC_TYPES = new Set<string>([
  DocumentType.PSCAD_REPORT,
  DocumentType.OEM_METADATA,
]);

/** True for documents the OEM/model-only roles are allowed to see. */
export function isModelDoc(id: string): boolean {
  return MODEL_DOC_TYPES.has(id) || ["pscad", "psse"].includes(id);
}

// Loosely associate a finding's source_document string with an uploaded doc.
function fileMatches(sourceDoc: string, d: ReportDocument, label: string): boolean {
  const s = sourceDoc.toLowerCase();
  const base = d.filename.toLowerCase().replace(/\.[^.]+$/, "");
  return (
    s.includes(base) ||
    s.includes(d.doc_type.replace(/_/g, " ")) ||
    s.includes(label.toLowerCase())
  );
}

function buildDocGroups(
  label: string,
  findings: Finding[],
  failed: boolean
): DeltaGroup[] {
  if (failed) {
    return [
      {
        label: "Extraction warning",
        kind: "del",
        items: [
          {
            clause: label,
            text: "This document could not be structured — it was excluded from clause assessment. Re-upload a machine-readable version.",
          },
        ],
      },
    ];
  }
  if (findings.length === 0) {
    return [
      {
        label: "No issues",
        kind: "add",
        items: [
          {
            clause: label,
            text: "Parsed successfully. No clause-level findings reference this document.",
          },
        ],
      },
    ];
  }
  return [
    {
      label: `${findings.length} finding${findings.length === 1 ? "" : "s"}`,
      kind: "mod",
      items: findings.map((f) => ({
        clause: f.clause ?? f.assessor,
        text: escapeHtml(f.description),
      })),
    },
  ];
}

/** Project the uploaded documents (+ their findings) into the Documents view. */
export function reportToDocItems(report: AuditReport): DocRecord[] {
  const docs = report.documents ?? [];
  return docs.map((d): DocRecord => {
    const meta = DOC_META[d.doc_type] ?? { icon: "DOC", label: d.doc_type };
    const failed = d.schema_backed && !d.extracted;
    const docFindings = report.findings.filter(
      (f) => f.source_document && fileMatches(f.source_document, d, meta.label)
    );
    return {
      id: d.doc_type,
      icon: meta.icon,
      name: d.filename,
      type: meta.label,
      ver: d.schema_backed ? (d.extracted ? "parsed" : "extract failed") : "raw text",
      changed: failed || docFindings.length > 0,
      delta: {
        when: failed
          ? "Extraction failed — excluded from clause assessment"
          : `Parsed in this audit · ${docFindings.length} finding${docFindings.length === 1 ? "" : "s"} reference this document`,
        groups: buildDocGroups(meta.label, docFindings, failed),
      },
    };
  });
}

function findingSource(assessor: string): "AEMO" | "Transgrid" {
  return assessor.toLowerCase().includes("nsp") ? "Transgrid" : "AEMO";
}

function severityToIssueSeverity(sev: Severity): IssueSeverity {
  if (sev === Severity.DMAT_TRIGGERING || sev === Severity.HIGH) return "blocking";
  if (sev === Severity.MEDIUM) return "major";
  return "minor";
}

/** Project findings into the RFI / issue-tracker rows (predicted, pre-AEMO). */
export function reportToIssueItems(report: AuditReport): IssueRecord[] {
  return report.findings.map(
    (f): IssueRecord => ({
      id: f.finding_id,
      src: findingSource(f.assessor),
      sev: severityToIssueSeverity(f.severity),
      clause: f.clause ?? "—",
      title: f.title,
      body: f.description,
      status: "open",
    })
  );
}

function buildDraft(f: Finding): string {
  const cite = f.source_document
    ? `<span class="ai-src">${f.source_document}</span>`
    : f.psmg_ref
      ? `<span class="ai-src">PSMG ${f.psmg_ref}</span>`
      : `<span class="ai-src">submission documents</span>`;
  const sev = f.severity.replace(/_/g, " ");
  return `Predicted ${sev} issue — ${f.title}${f.clause ? ` (${f.clause})` : ""}:

${f.description}

Recommended action: ${f.recommended_action} (estimated effort: ${f.rectification_effort}). Evidence basis: ${cite}.

This is a pre-submission prediction from the R1GPT audit — resolve before lodgement to avoid a TDD round.`;
}

/** AI-draft text keyed by finding id, for the response copilot drawer. */
export function reportToDrafts(report: AuditReport): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of report.findings) out[f.finding_id] = buildDraft(f);
  return out;
}

/** Synthesize a live activity feed describing the most recent audit run. */
export function reportToActivity(report: AuditReport): ActivityRecord[] {
  const blocking = report.findings.filter(
    (f) => f.severity === Severity.HIGH || f.severity === Severity.DMAT_TRIGGERING
  ).length;

  const entries: ActivityRecord[] = [
    {
      who: "You",
      txt: `ran pre-submission audit on ${report.project_name} — ${report.findings.length} finding${
        report.findings.length === 1 ? "" : "s"
      }, ${blocking} blocking`,
      when: "now",
      tone: blocking > 0 ? "red" : "green",
    },
  ];

  if (report.extraction_warnings.length > 0) {
    entries.push({
      who: "R1GPT",
      txt: `${report.extraction_warnings.length} document(s) failed extraction and were excluded`,
      when: "now",
      tone: "amber",
    });
  }

  for (const d of report.documents ?? []) {
    entries.push({ who: "Upload", txt: `added ${d.filename}`, when: "now", tone: "blue" });
  }

  return entries.slice(0, 6);
}
