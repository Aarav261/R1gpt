// Static demo data for the R1GPT workspace dashboard.
// Domain content mirrors the Wattle Creek BESS connection scenario; the Audit
// view can additionally run a *live* assessment through the real pipeline
// (see lib/dashboard/auditClient.ts).

export type TagTone = "blue" | "green" | "amber" | "red" | "grey";

export interface RoleConfig {
  label: string;
  access: string;
  docs: "all" | "summary" | "models";
  issues: "full" | "summary" | "model-only";
  canDraft: boolean;
}

export const ROLES: Record<string, RoleConfig> = {
  consultant: {
    label: "Consultant",
    access: "full technical access",
    docs: "all",
    issues: "full",
    canDraft: true,
  },
  proponent: {
    label: "Proponent",
    access: "business summary — no model internals",
    docs: "summary",
    issues: "summary",
    canDraft: false,
  },
  oem: {
    label: "OEM (Sungrow)",
    access: "model files & test reports only",
    docs: "models",
    issues: "model-only",
    canDraft: false,
  },
  nsp: {
    label: "NSP (Transgrid)",
    access: "review — local network impact",
    docs: "all",
    issues: "full",
    canDraft: false,
  },
  aemo: {
    label: "AEMO Reviewer",
    access: "review — sees audit report & deltas",
    docs: "all",
    issues: "full",
    canDraft: false,
  },
};

export type RoleKey = keyof typeof ROLES;

export interface DeltaItem {
  clause: string;
  text: string;
}
export interface DeltaGroup {
  label: string;
  kind: "mod" | "add" | "del";
  items: DeltaItem[];
}
export interface DocDelta {
  when: string;
  groups: DeltaGroup[];
}
export interface DocRecord {
  id: string;
  icon: string;
  name: string;
  type: string;
  ver: string;
  changed: boolean;
  delta: DocDelta | null;
}

export const DOCS: DocRecord[] = [
  {
    id: "gps",
    icon: "GPS",
    name: "GPS Document",
    type: "NER S5.2.5 performance standards",
    ver: "v3.2",
    changed: true,
    delta: {
      when: "Uploaded 2h ago by C. Nguyen · addresses AEMO R2 items #1, #4",
      groups: [
        {
          label: "Modified",
          kind: "mod",
          items: [
            {
              clause: "S5.2.5.5 — Voltage ride-through",
              text: "FRT commencement timing changed <code>0.43 s → 0.22 s</code> to meet ERC0393 automatic access standard.",
            },
            {
              clause: "S5.2.5.8 — Reactive current injection",
              text: "Injection coefficient revised <code>2.0 → 2.5 pu/pu</code>; formula now explicitly stated (was placeholder).",
            },
          ],
        },
        {
          label: "Added",
          kind: "add",
          items: [
            {
              clause: "S5.2.5.13 — Active power recovery",
              text: "Added recovery profile curve + 95% within <code>250 ms</code> commitment.",
            },
          ],
        },
        {
          label: "Removed",
          kind: "del",
          items: [
            {
              clause: "Appendix C",
              text: "Removed superseded pre-ERC0393 reactive capability table.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "dmat",
    icon: "DMAT",
    name: "DMAT Results",
    type: "PSCAD / EMT simulation results",
    ver: "v2.1",
    changed: true,
    delta: {
      when: "Uploaded 1d ago by C. Nguyen",
      groups: [
        {
          label: "Modified",
          kind: "mod",
          items: [
            {
              clause: "Test set 4 — Fault ride-through",
              text: "Re-run with updated FRT timing; 3 of 200 scenarios still <code>missing</code> (flagged by audit).",
            },
          ],
        },
      ],
    },
  },
  {
    id: "pscad",
    icon: "PSCAD",
    name: "PSCAD Model (Sungrow)",
    type: "PowerTitan 2.0 · v3.1.4 · encrypted DLL",
    ver: "v3.1.4",
    changed: false,
    delta: {
      when: "Uploaded 6d ago by OEM · Sungrow",
      groups: [
        {
          label: "No changes since last review",
          kind: "add",
          items: [
            {
              clause: "Model registry",
              text: "Version <code>3.1.4</code> — AEMO-accepted. Clears the known v3.1.2 DLL compile issue.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "psse",
    icon: "PSS/E",
    name: "PSS/E Model",
    type: ".sav / .dyr · v34",
    ver: "v34",
    changed: false,
    delta: null,
  },
  {
    id: "prot",
    icon: "PROT",
    name: "Protection Settings",
    type: "Relay settings & coordination",
    ver: "v1.0",
    changed: false,
    delta: null,
  },
  {
    id: "rep",
    icon: "RPT",
    name: "Technical Report",
    type: "Connection design & compliance narrative",
    ver: "v2.0",
    changed: false,
    delta: null,
  },
];

export type AuditState = "pass" | "warn" | "fail";
export interface AuditItem {
  s: AuditState;
  name: string;
  d: string;
}

export const AUDIT: AuditItem[] = [
  {
    s: "pass",
    name: "File formats valid",
    d: "PSS/E v34, PSCAD V5 .pscx + DLL present, all docs PDF/DOCX",
  },
  {
    s: "pass",
    name: "ERC0393 access standard version match",
    d: "Enquiry date 14 Mar 25 → post-ERC0393 ruleset correctly applied",
  },
  {
    s: "pass",
    name: "OEM model version registered",
    d: "Sungrow PowerTitan 2.0 v3.1.4 — AEMO-accepted",
  },
  {
    s: "pass",
    name: "GPS document register complete",
    d: "All mandatory sections present",
  },
  {
    s: "pass",
    name: "Technical report structure",
    d: "Matches AEMO R1 Capability Assessment Guideline",
  },
  {
    s: "warn",
    name: "GPS S5.2.5 completeness",
    d: "2 sections contain placeholder text — review S5.2.5.11, S5.2.5.12",
  },
  {
    s: "fail",
    name: "DMAT scenario coverage",
    d: "BLOCKING — 3 of 200 required FRT scenarios missing from results set",
  },
  {
    s: "fail",
    name: "Reactive current injection formula stated",
    d: "BLOCKING — S5.2.5.8 references a value but the governing formula is not in the document",
  },
];

export type IssueSeverity = "blocking" | "major" | "minor";
export type IssueStatus = "open" | "resolved";
export interface IssueRecord {
  id: string;
  src: "AEMO" | "Transgrid";
  sev: IssueSeverity;
  clause: string;
  title: string;
  body: string;
  status: IssueStatus;
}

export const ISSUES: IssueRecord[] = [
  {
    id: "R2-1",
    src: "AEMO",
    sev: "blocking",
    clause: "S5.2.5.8",
    title: "Reactive current injection response does not clearly meet automatic access standard",
    body: "AEMO requests the proponent demonstrate the reactive current injection response under the revised ERC0393 coefficient and provide the governing formula.",
    status: "open",
  },
  {
    id: "R2-2",
    src: "AEMO",
    sev: "blocking",
    clause: "S5.2.5.13",
    title: "Active power recovery profile not evidenced in DMAT set 4",
    body: "The active power recovery commitment (95% within 250 ms) is stated in the GPS but the supporting DMAT scenarios are incomplete.",
    status: "open",
  },
  {
    id: "R2-3",
    src: "Transgrid",
    sev: "minor",
    clause: "—",
    title: "Confirm fault level at connection point against latest network model",
    body: "NSP requests confirmation of three-phase fault level used in studies against the Q2 2026 network model.",
    status: "resolved",
  },
  {
    id: "R2-4",
    src: "AEMO",
    sev: "major",
    clause: "S5.2.5.5",
    title: "Model-vs-site FRT timing mismatch flagged",
    body: "AEMO notes the FRT commencement timing in the PSCAD model differs from the value declared in the GPS document.",
    status: "open",
  },
];

export interface ActivityRecord {
  who: string;
  txt: string;
  when: string;
  tone: TagTone;
}

export const ACTIVITY: ActivityRecord[] = [
  { who: "AEMO", txt: "raised TDD Round 2 issue #R2-2 (active power recovery)", when: "2h", tone: "red" },
  { who: "C. Nguyen", txt: "uploaded GPS Document v3.2", when: "2h", tone: "blue" },
  { who: "Sungrow", txt: "confirmed model v3.1.4 clears the v3.1.2 DLL issue", when: "1d", tone: "green" },
  { who: "Transgrid", txt: "resolved issue #R2-3 (fault level)", when: "2d", tone: "green" },
  { who: "You", txt: "ran pre-submission audit — 2 blocking items found", when: "2d", tone: "amber" },
];

export interface ModelRecord {
  name: string;
  ver: string;
  status: string;
  tone: TagTone;
  note: string;
}

export const MODELS: ModelRecord[] = [
  {
    name: "Sungrow PowerTitan 2.0",
    ver: "v3.1.4",
    status: "AEMO-accepted",
    tone: "green",
    note: "Used on 3 projects on R1GPT · known issue on v3.1.2 (DLL compile, PSCAD V5.4) — resolved in 3.1.4",
  },
  {
    name: "Sungrow PowerTitan 2.0",
    ver: "v3.1.2",
    status: "Known issue",
    tone: "red",
    note: "⚠ Cross-project flag: DLL compilation failure on PSCAD V5.4. 2 other projects affected — upgrade to 3.1.4.",
  },
];

// AI-drafted RFI responses, keyed by issue id. Each <span class="ai-src"> cite
// is rendered as a Carbon inline source chip in the drawer.
export const DRAFTS: Record<string, string> = {
  "R2-1": `In response to AEMO's query on reactive current injection (S5.2.5.8):

The revised injection coefficient of 2.5 pu/pu is now governed by the explicit formula added to <span class="ai-src">GPS v3.2 §S5.2.5.8</span>. The response has been re-simulated under the ERC0393 automatic access standard; results are provided in <span class="ai-src">DMAT v2.1 · Test set 7</span>, demonstrating compliance at the connection point voltage range.

We propose to close this item on the basis of the updated formula and supporting simulation.`,
  "R2-2": `In response to AEMO #R2-2 (active power recovery, S5.2.5.13):

The 95%-within-250 ms recovery commitment declared in <span class="ai-src">GPS v3.2 §S5.2.5.13</span> requires the three missing FRT scenarios identified by the pre-submission audit. These are being added to <span class="ai-src">DMAT Test set 4</span> and will be re-lodged.

Recommended action: complete the 3 outstanding scenarios before responding — drafting a response now would be premature and risks a third TDD round.`,
  "R2-4": `In response to AEMO #R2-4 (model-vs-site FRT timing, S5.2.5.5):

The discrepancy arises because the PSCAD model <span class="ai-src">Sungrow v3.1.4</span> retained the pre-revision timing. The model parameter has been aligned to the 0.22 s value declared in <span class="ai-src">GPS v3.2 §S5.2.5.5</span>. A corrected model and re-run will be uploaded.

This is a known materiality signal: FRT timing mismatch re-opened GPS on comparable projects — recommend re-running before resubmission.`,
};

export interface PipelineStage {
  name: string;
  meta: string;
  when: string;
  state: "done" | "active" | "pending";
}

export const PIPELINE: PipelineStage[] = [
  { name: "Connection Enquiry", meta: "Transgrid · scope confirmed", when: "14 Mar 25", state: "done" },
  { name: "GPS Negotiation", meta: "Access standards agreed · ERC0393", when: "02 Sep 25", state: "done" },
  { name: "R1 Submitted", meta: "GPS v3.0 + DMAT + models lodged", when: "28 Mar 26", state: "done" },
  { name: "TDD Round 1", meta: "12 issues raised · all resolved", when: "06 May 26", state: "done" },
  { name: "TDD Round 2", meta: "4 issues open · 2 blocking", when: "in progress", state: "active" },
  { name: "R1 Acceptance", meta: "Model accepted → registration", when: "pending", state: "pending" },
];

export const PROJECT = {
  name: "Wattle Creek BESS",
  meta1: "200 MW / 400 MWh · Grid-forming",
  meta2: "Transgrid · CWO REZ (NSW)",
  tag: "R1 · TDD ROUND 2",
};
