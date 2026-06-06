# Limitations & honest boundaries

R1GPT is a pre-submission triage aid, not a substitute for a chartered
power-systems engineer's judgement. This document states plainly what the tool
does *not* do — both because it's true, and because naming a limitation before a
judge does converts an attack into a credibility win.

## 1. Extraction is probabilistic; only the assessment is deterministic

The honest boundary runs straight through the product:

- **Extraction layer** (`lib/extraction/`) — gpt-4o reads messy PDFs and emits
  JSON. This is stochastic even at `temperature: 0`. It is the genuinely hard
  engineering problem, and it is *not* a differentiator we can claim to have
  solved. The "structured audit engine, not a chatbot" framing must not paper
  over the fact that the extraction layer *is* an LLM.
- **Safety net** — every AI response is validated against a strict Zod schema
  (`lib/extraction/schemas.ts`). On failure the document's `extracted` model is
  `null` and it is excluded from clause assessment.
  - **Closed:** extraction failures are now surfaced. `AuditReport` carries an
    `extraction_warnings: string[]` field, populated in `lib/report/builder.ts`
    for any schema-backed document whose extraction returned `null`, and rendered
    as a warning banner at the top of the report page. The Zod safety net is now
    a visible honesty signal, not just a server log line.
- **Assessment + scoring** (`lib/assessors/`, `lib/scoring/`) — pure functions.
  Same `UploadedDocument[]` in → same findings and score out, every time.

## 2. The score is not a forecast

See `METHODOLOGY.md`. The score is now a deterministic **readiness index
(0–100)** — the fabricated "approval probability + confidence interval" has been
removed from the code. It is still **not** a forecast: it ranks what to fix
first, it does not predict AEMO's decision. Do not present it as a calibrated
probability in any pitch.

## 3. The demo is synthetic and, today, circular

The bundled *Ironbark Solar Farm* package (`synthetic/fixtures/`) was authored to
trigger the exact findings the assessors look for. It proves the `if` statements
fire; it proves **nothing** about generalisation to a real, heterogeneous
400-page submission with scanned tables, vendor-specific formatting and
ambiguous prose.

*Recommended mitigation (pre-empts the "your fixtures are rigged" attack):* run
the extractor once on a genuine, redacted R1 artifact you did **not** author —
live or recorded — and let it partially fail honestly. Naming the failure mode
of LLM extraction and showing the Zod safety net catch it is more convincing
than a flawless rigged run. See `STRESS_TEST.md`.

## 4. Citations are not yet source-verified

The entire moat is "we cite the exact section AEMO would." That moat is only as
strong as the weakest reference. The PSMG/NER section numbers in the code were
authored from working knowledge and have **not** been line-checked against the
controlled PSMG v3.0 PDF. The specific internal inconsistencies are now fixed
(the DELTA-001 §6.3/§6.4 mismatch, the §6.2.1 "10% tolerance" label, and the
SCR > 10 "hard exemption" — see `CITATIONS.md`). The remaining `CONFIRM` rows
still need a line-check against the controlled PDF before any pitch.

## 5. No calibration, no liability model, no AEMO endorsement

- AEMO will never endorse a third-party "approval probability" — it implies they
  rubber-stamp the score. GTM cannot route through AEMO.
- Buyers (EMT/connection consultancies, proponents) employ chartered engineers
  who sign submissions under professional indemnity. A wrong score that nudges an
  early submission has real liability. Position R1GPT as a **checklist / triage
  accelerator that surfaces the RFI before AEMO does**, with a human engineer in
  the loop — not as a judgement-replacing oracle.

## 6. Sustainability claims stay qualitative

The connection queue is the binding constraint on Australia's renewable
build-out, so clearing RFI cycles faster has leveraged grid impact. Keep this
**qualitative**. Do not put a "MW unlocked" or "tCO₂ abated" number on screen —
without a counterfactual you don't have, that is greenwashing and is trivially
attacked. "We attack the queue, the binding constraint" is defensible; a
quantified abatement figure is not.
