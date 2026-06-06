# R1GPT — Connection Approval Audit Engine

R1GPT is an AI audit engine for **R1 connection approval submissions** in
Australia's National Electricity Market (NEM). You upload your R1 submission
package — GPS baseline, FAT report, OEM metadata and optional PSCAD/EMT studies
— and R1GPT returns a structured, clause-by-clause audit report: a calibrated
approval probability with confidence bounds, a NER S5.2 clause scorecard,
severity-ranked findings with traceable evidence chains, predicted AEMO/NSP RFI
questions, and a rectification plan with effort estimates. Every finding cites
the exact source document, source field, and the specific section of AEMO's
**Power System Model Guidelines v3.0 (September 2025)** it maps to.

## How is this different from ChatGPT?

A general LLM gives you a **conversation**. R1GPT gives you a **structured audit
report**. If you upload these documents to ChatGPT, it reads them and offers
opinions in prose. R1GPT instead runs **six deterministic assessors** —
impedance/firmware delta, clause evidence matrix, mandatory-artefact evidence
checks, firmware DMAT comparison, NSP staleness, and EMT/RMS model adequacy —
each grounded in a specific PSMG v3.0 section. The output is reproducible: the
same documents always produce the same findings, the same severity-weighted
approval probability (not a sentiment guess), and the same PSMG citations AEMO
would reference in a real RFI letter. The clause scorecard shows
pass/fail/partial/missing per NER S5.2 clause, and every finding is traceable to
a document field and a regulation section — not an opinion.

## Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set OPENAI_API_KEY=sk-...
npm run dev
```

Open <http://localhost:3000>.

The extraction layer and RFI generation use OpenAI `gpt-4o`. Document extraction
runs at temperature 0 with strict JSON schema validation (Zod) on every AI
response.

## Demo

Click **"Load demo documents"** on the upload page. This loads the bundled
synthetic *Ironbark Solar Farm 400MW* package (a realistic IBR solar project
that fails the audit instructively, exercising all six assessors) and runs a
full audit end to end. Expected findings include a DMAT-triggering transformer
impedance delta (PSMG §6.3/§6.4), a major firmware bump since the DMAT baseline
(PSMG §4.8), absent harmonic filter design and block diagrams (PSMG §4.6.1,
§5.2.2), a stale GPS baseline (PSMG §4.8), and unconfirmed EMT model / unstated
SCR (PSMG §4.3, §3.4).

To regenerate the demo `.pdf` fixtures from their `.txt` sources:

```bash
npm run gen:fixtures
```

## Regulatory grounding

> Clause assessors are grounded in AEMO Power System Model Guidelines v3.0,
> effective 25 September 2025. All PSMG section references are cited in findings
> and predicted RFI questions.

R1GPT audits against PSMG v3.0 only — the `psmg_version` field is hardcoded to
`"3.0"` throughout the report so the basis of every verdict is explicit.

## Architecture

```
app/
  page.tsx                 Upload page + streaming progress
  audit/[auditId]/page.tsx Full audit report (7 sections)
  api/audit/route.ts       Streaming pipeline (NDJSON events)
  api/audit/[auditId]      Report retrieval
  api/demo, api/health
lib/
  extraction/              PDF parse + gpt-4o extraction + Zod schemas
  assessors/               delta, clause, evidence, firmware, nsp, model_adequacy
  scoring/engine.ts        Severity-weighted probability + timeline
  report/                  builder + PSMG-grounded RFI generation
types/                     documents.ts, report.ts
synthetic/fixtures/        Ironbark Solar Farm demo package
```

The audit API streams four NDJSON events in order: `extraction_complete`,
`assessment_complete`, `scoring_complete`, `report_complete` (carrying the full
`AuditReport`). The completed report is stored in a module-level map keyed by
`audit_id` for retrieval by the report page.

## Scoring

Each finding contributes a severity penalty (low 0.04, medium 0.12, high 0.25,
DMAT-triggering 0.45). The aggregate penalty is squeezed through a sigmoid to
yield the approval probability; the confidence interval narrows as the finding
count grows. Time-to-approval (P10/P50/P90 months) is bucketed by the presence
of DMAT-triggering and high-severity findings.

## Deployment

R1GPT is Vercel-ready — no database or external services beyond the OpenAI API.

```bash
vercel deploy           # preview
vercel deploy --prod    # production
```

Set `OPENAI_API_KEY` in the Vercel project's environment variables.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · OpenAI SDK
(gpt-4o) · pdf-parse · Zod · nanoid. IBM Plex Mono for data values, clause
references and PSMG section numbers; Inter for body text.
