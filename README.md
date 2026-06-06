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

> **Hardening notes (read before pitching).** A judge-lens review flagged
> several overclaims; the fixes below are now **applied to the code**:
> - [`METHODOLOGY.md`](METHODOLOGY.md) — the score is now a deterministic
>   **readiness index (0–100)**: "calibrated", the confidence interval, the
>   sigmoid and the month percentiles are removed (`lib/scoring/engine.ts`).
> - [`LIMITATIONS.md`](LIMITATIONS.md) — the honest extraction/score/demo
>   boundaries. Extraction failures now surface as an `extraction_warnings`
>   banner in the report (was a silent server log).
> - [`CITATIONS.md`](CITATIONS.md) — the DELTA-001 §6.3/§6.4/§6.2.1 mismatch and
>   the SCR > 10 "hard exemption" overclaim are corrected; thresholds are now
>   labelled as R1GPT triage thresholds. Remaining `CONFIRM` rows still need a
>   line-check against the controlled PSMG v3.0 PDF.
> - [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — lead with the evidence chain, not the
>   gauge; Q&A kill-shots and answers.
> - [`STRESS_TEST.md`](STRESS_TEST.md) — the deterministic-core stress harness is
>   committed (`npm run stress`, 24/24 passing) and the floating-point
>   threshold-boundary bug is fixed.

## How is this different from ChatGPT?

A general LLM gives you a **conversation**. R1GPT gives you a **structured audit
report**. If you upload these documents to ChatGPT, it reads them and offers
opinions in prose. R1GPT instead runs **six deterministic assessors** —
impedance/firmware delta, clause evidence matrix, mandatory-artefact evidence
checks, firmware DMAT comparison, NSP staleness, and EMT/RMS model adequacy —
each grounded in a specific PSMG v3.0 section. The output is reproducible: the
same documents always produce the same findings, the same severity-weighted
**readiness index** (a ranking of what to fix first — not a probability of
approval, not a sentiment guess), and the same PSMG citations AEMO would
reference in a real RFI letter. The clause scorecard shows
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

The upload page offers two bundled synthetic packages:

- **"Load failing demo"** — *Ironbark Solar Farm 400MW*, a realistic IBR solar
  project that fails the audit instructively, exercising all six assessors.
  Expected findings include a DMAT-triggering transformer impedance delta
  (PSMG §6.3/§6.4), a major firmware bump since the DMAT baseline (PSMG §4.8),
  absent harmonic filter design and block diagrams (PSMG §4.6.1, §5.2.2), a
  stale GPS baseline (PSMG §4.8), and unstated SCR (PSMG §3.4). Result: a low
  readiness index (severe RFI-cycle risk), `dmat_triggering` materiality.
- **"Load passing demo"** — *Wattle Creek BESS 200MW*, a fully PSMG-compliant
  grid-forming BESS submission (GPS + FAT + OEM + PSCAD). As-built impedance
  within 1% of design, firmware matching the DMAT baseline, harmonic filter
  design and block diagrams provided, RUG provided, SCR 15.2, recent GPS.
  Result: **0 findings, readiness index 95 (the checklist ceiling), all
  applicable checks passed, minimal RFI-cycle risk, all seven clauses PASS**.

Pick one, then click **"Run Audit"** to run the full pipeline end to end.

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

The headline number is a **deterministic readiness index**, not a calibrated
probability. Each finding carries a transparent severity weight (low 4,
medium 12, high 25, DMAT-triggering 45) and the index is plain subtraction —
`readiness = clamp(0..95, 95 − Σ weight)` — so a reviewer can read the
arithmetic. There is no sigmoid and no confidence interval (AEMO publishes no
clause-level R1 outcomes to calibrate against).

The index is deliberately **capped at 95, not 100**: passing every automated
check means "nothing in our finite checklist fired", which is not proof of
completeness — the reserved headroom stands for the chartered-engineer review
R1GPT can't automate. It also **saturates at 0**: once findings stack up the
number stops discriminating, so among failing submissions the signal lives in
the findings list, materiality and RFI band, not the index. To keep both rails
honest the report always shows an **"X of N checks passed"** coverage line (only
applicable assessors count toward N). Instead of fabricated P10/P50/P90 month
percentiles, it shows a qualitative **RFI-cycle risk band** (minimal → elevated
→ high → severe). See `lib/scoring/engine.ts` and `METHODOLOGY.md`.

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
