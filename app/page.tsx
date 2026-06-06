"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentType } from "@/types/documents";
import { UploadZone, DocSlotConfig } from "@/components/upload/UploadZone";

const SLOTS: DocSlotConfig[] = [
  {
    type: DocumentType.GPS_BASELINE,
    label: "GPS / 5.3.4A Baseline",
    description: "Agreed GPS schedule and design data",
    psmg: "Required · PSMG §4.1, §4.2",
    required: true,
  },
  {
    type: DocumentType.FAT_REPORT,
    label: "FAT Report",
    description: "Transformer factory acceptance test results",
    psmg: "Required · PSMG §4.1, §5.2.2",
    required: true,
  },
  {
    type: DocumentType.OEM_METADATA,
    label: "OEM Model Metadata",
    description: "Firmware version and DMAT baseline",
    psmg: "Required · PSMG §4.8",
    required: true,
  },
  {
    type: DocumentType.PSCAD_REPORT,
    label: "PSCAD / EMT Study",
    description: "Electromagnetic transient study output",
    psmg: "Optional · PSMG §4.3",
    required: false,
  },
  {
    type: DocumentType.CONNECTION_AGREEMENT,
    label: "Connection Agreement",
    description: "Executed connection agreement",
    psmg: null,
    required: false,
  },
  {
    type: DocumentType.RFI_HISTORY,
    label: "Prior RFI History",
    description: "Previous AEMO/NSP correspondence",
    psmg: null,
    required: false,
  },
];

const REQUIRED: DocumentType[] = [
  DocumentType.GPS_BASELINE,
  DocumentType.FAT_REPORT,
  DocumentType.OEM_METADATA,
];

const STEPS = [
  "Extracting document data...",
  "Running PSMG clause assessors...",
  "Computing approval probability...",
  "Generating AEMO RFI predictions...",
];

type FileMap = Partial<Record<DocumentType, File>>;

export default function HomePage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileMap>({});
  const [projectName, setProjectName] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const setFile = useCallback((type: DocumentType, file: File | null) => {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[type] = file;
      else delete next[type];
      return next;
    });
  }, []);

  const canRun = useMemo(
    () =>
      REQUIRED.every((t) => files[t]) &&
      projectName.trim().length > 0 &&
      !running,
    [files, projectName, running]
  );

  const loadDemo = useCallback(async (set: "fail" | "pass" = "fail") => {
    setError(null);
    try {
      const res = await fetch(`/api/demo?set=${set}`);
      const data = await res.json();
      setProjectName(data.project_name);
      const next: FileMap = {};
      for (const doc of data.docs) {
        next[doc.doc_type as DocumentType] = new File(
          [doc.content],
          doc.filename,
          { type: "application/pdf" }
        );
      }
      setFiles(next);
    } catch {
      setError("Could not load demo documents.");
    }
  }, []);

  const runAudit = useCallback(async () => {
    setRunning(true);
    setError(null);
    setStep(0);

    const form = new FormData();
    form.append("project_name", projectName.trim());
    for (const [type, file] of Object.entries(files)) {
      if (file) form.append(type, file);
    }

    try {
      const res = await fetch("/api/audit", { method: "POST", body: form });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Audit request failed.");
        throw new Error(msg || "Audit request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as { event: string; data: unknown };
          if (evt.event === "extraction_complete") setStep(1);
          if (evt.event === "assessment_complete") setStep(2);
          if (evt.event === "scoring_complete") setStep(3);
          if (evt.event === "error") {
            throw new Error(
              (evt.data as { message?: string })?.message ?? "Audit failed."
            );
          }
          if (evt.event === "report_complete") {
            const report = evt.data as { audit_id: string };
            try {
              sessionStorage.setItem(
                `r1gpt:${report.audit_id}`,
                JSON.stringify(evt.data)
              );
            } catch {
              /* sessionStorage may be unavailable; server store is fallback */
            }
            router.push(`/audit/${report.audit_id}`);
            return;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
      setRunning(false);
      setStep(-1);
    }
  }, [files, projectName, router]);

  return (
    <main className="mx-auto max-w-[780px] px-5 py-12">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-4xl font-bold tracking-tight text-text-primary">
            R1GPT
          </h1>
          <span className="rounded border border-border bg-bg-surface px-2 py-0.5 font-mono text-[11px] text-accent-purple">
            PSMG v3.0 · September 2025
          </span>
        </div>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Connection Approval Audit Engine
        </p>
      </header>

      {/* Differentiator banner */}
      <section className="mb-8 rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-5">
        <h2 className="font-mono text-base font-semibold text-text-primary">
          Not a chatbot. A structured audit engine.
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-text-secondary">
          Upload your R1 submission package and receive a clause-by-clause
          verdict grounded in AEMO&apos;s Power System Model Guidelines v3.0.
          Every finding cites the specific PSMG section AEMO would reference in
          an RFI letter.
        </p>
      </section>

      {/* Upload grid */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <UploadZone
            key={slot.type}
            config={slot}
            file={files[slot.type as DocumentType] ?? null}
            onFile={(f) => setFile(slot.type as DocumentType, f)}
            disabled={running}
          />
        ))}
      </section>

      {/* Project name + actions */}
      <section className="mb-6">
        <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-text-muted">
          Project name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={running}
          placeholder="e.g. Ironbark Solar Farm 400MW"
          className="w-full rounded-lg border border-border bg-bg-surface px-4 py-3 font-sans text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active"
        />
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={runAudit}
          disabled={!canRun}
          className={`rounded-lg px-6 py-3 font-mono text-sm font-semibold transition-colors ${
            canRun
              ? "bg-accent-blue text-bg-primary hover:bg-accent-blue/90"
              : "cursor-not-allowed bg-bg-highlight text-text-muted"
          }`}
        >
          {running ? "Auditing…" : "Run Audit"}
        </button>
        <button
          onClick={() => loadDemo("fail")}
          disabled={running}
          className="font-mono text-sm text-accent-purple underline-offset-4 hover:underline disabled:opacity-50"
        >
          Load failing demo
        </button>
        <span className="font-mono text-xs text-text-muted">·</span>
        <button
          onClick={() => loadDemo("pass")}
          disabled={running}
          className="font-mono text-sm text-accent-green underline-offset-4 hover:underline disabled:opacity-50"
        >
          Load passing demo
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded border border-accent-red/40 bg-accent-red/10 px-4 py-2 font-mono text-sm text-accent-red">
          {error}
        </p>
      )}

      {/* Progress timeline */}
      {running && (
        <section className="mt-8 rounded-lg border border-border bg-bg-surface p-5">
          <ol className="space-y-3">
            {STEPS.map((label, i) => {
              const state =
                i < step ? "done" : i === step ? "active" : "pending";
              return (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs ${
                      state === "done"
                        ? "bg-accent-green/20 text-accent-green"
                        : state === "active"
                          ? "bg-accent-blue/20 text-accent-blue"
                          : "bg-bg-highlight text-text-muted"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={`font-mono text-sm ${
                      state === "pending"
                        ? "text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {label}
                    {state === "active" && (
                      <span className="ml-1 animate-pulse text-accent-blue">
                        ▍
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <footer className="mt-12 border-t border-border pt-4 font-mono text-[11px] text-text-muted">
        Audited against AEMO Power System Model Guidelines v3.0 · Effective 25
        September 2025
      </footer>
    </main>
  );
}
