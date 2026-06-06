import type { AuditReport, Finding } from "@/types/report";
import { Severity } from "@/types/report";
import type { AuditState, AuditItem } from "./mock";

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
  onProgress?: (p: AuditProgress) => void
): Promise<AuditReport> {
  const demoRes = await fetch("/api/demo");
  if (!demoRes.ok) throw new Error("Failed to load demo fixtures.");
  const demo = (await demoRes.json()) as DemoPayload;

  const form = new FormData();
  form.set("project_name", demo.project_name);
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
            detail: `${Math.round((msg.data.probability ?? 0) * 100)}% approval probability`,
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
