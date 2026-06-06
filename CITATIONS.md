# Citation register — PSMG v3.0 & NER S5.2

> **Status.** This describes citations **as they exist in the code today**. The
> "Known inconsistencies to fix" section lists concrete bugs that are *still
> present* — they are recommendations, not completed work.

> **The moat is citation accuracy.** R1GPT's differentiator is that it names the
> exact clause AEMO would cite. If a judge catches one wrong reference, the moat
> is gone. This register puts every PSMG / NER citation in one place with an
> honest verification status.

## ⚠️ Verification status — read this first

The section numbers below were authored from working knowledge of the AEMO
**Power System Model Guidelines v3.0 (effective 25 September 2025)** and the NER
S5.2 generator performance standards. **They have NOT been line-checked against
the controlled source PDFs.** Until each is confirmed:

- Treat the **status** column as the *authors'* confidence — **not** AEMO
  endorsement and **not** independent verification.
- Before any pitch or customer demo, open the actual PSMG v3.0 PDF and the NER
  and confirm every `CONFIRM` row against the source text.
- Where a number is a threshold (percentages, SCR, IEC year), quote the clause
  **verbatim** in the finding text, or soften it. A paraphrased threshold is the
  easiest thing to attack.

Status legend: `VERIFIED ✓` line-checked against source · `CONFIRM` plausible,
unverified · `FIX` an internal inconsistency exists (see below).

## PSMG v3.0 references in current code

| Ref | Asserted meaning | Used in | Status |
|-----|------------------|---------|--------|
| §3.4 | EMT-model exemption tied to SCR > 10 | `model_adequacy.ts` (MADQ-003), `clause.ts` (S5.2.5.15 note) | FIX (too absolute) |
| §4.1 | Load-flow model inclusions — winding impedances (pos/neg/zero seq), taps, grounding (Table 4) | `clause.ts`, `rfi.ts`, upload UI | CONFIRM |
| §4.2 | Short-circuit / fault-level data to IEC 60909:2016 | `clause.ts`, `rfi.ts`, upload UI | CONFIRM |
| §4.3 | RMS and EMT stability model requirements; EMT for IBR where system strength is a concern | `clause.ts`, `model_adequacy.ts`, `rfi.ts` | CONFIRM |
| §4.3.2 | Frequency-control model requirements | `clause.ts` | CONFIRM |
| §4.6.1 | Harmonic emissions — frequency-dependent Norton equivalents + injection profiles per loading level | `evidence.ts`, `clause.ts`, `rfi.ts` | CONFIRM |
| §4.8 | Model/plant updates (firmware, control changes) require re-validation before registration | `delta.ts`, `firmware.ts`, `nsp.ts`, `rfi.ts` | CONFIRM |
| §5.1 | Releasable User Guide is a mandatory submission artefact | `evidence.ts` | CONFIRM |
| §5.2.2 | Transfer-function block diagrams mandatory for RMS models; black-box blocks not acceptable | `evidence.ts`, `model_adequacy.ts`, `clause.ts`, `rfi.ts` | CONFIRM |
| §6.2.1 | Model response within 10% of actual for 95% of samples in the transient window | `delta.ts` (DELTA-001 ≤10% branch), `rfi.ts` | FIX (mislabelled) |
| §6.3 | Model validation and confirmation | `clause.ts` (S5.2.8), `delta.ts` (DELTA-001 >10% branch) | FIX (see below) |
| §6.4 | Non-conformance — AEMO may impose operational constraints until resolved | `delta.ts` (in description text), `rfi.ts` | CONFIRM |

## NER S5.2 clause references

| Clause | Topic (as used) | Status |
|--------|-----------------|--------|
| S5.2.5.2 | Quality of supply / harmonics | CONFIRM |
| S5.2.5.5, .8, .12 | (referenced in extraction prompts) | CONFIRM (numbering shifts between NER versions — reconcile) |
| S5.2.5.9 | Protection systems / model representation | CONFIRM |
| S5.2.5.11 | Frequency control | CONFIRM |
| S5.2.5.13 | Voltage and reactive power control | CONFIRM |
| S5.2.5.14 | Active power control | CONFIRM |
| S5.2.5.15 | Short-circuit ratio / system strength | CONFIRM |
| S5.2.8 | Fault ride-through / R2 validation | CONFIRM |

## Known inconsistencies to fix (still present in code)

These are concrete, catchable bugs. Fix before pitching — each is a moat-breaker.

1. **DELTA-001 (>10% branch) — `psmg_ref` ≠ description.** In
   `lib/assessors/delta.ts`, `psmg_ref` reads *"Section 6.3 — Model validation;
   Section 4.8 — Model updates"* but the `description` cites *"PSMG Section
   6.4"* and the `recommended_action` cites *"Section 6.3"*. Three different
   numbers for one finding. **Fix:** pick the correct primary duty (§4.8 covers
   "a changed model must be re-validated"; §6.4 covers the consequence) and make
   `psmg_ref`, description and action agree.

2. **DELTA-001 (>5% branch) — §6.2.1 mislabelled.** `psmg_ref` reads *"Section
   6.2.1 — Accuracy criteria (10% tolerance)"*. §6.2.1 is about **model
   response** accuracy (within 10% for 95% of samples in the transient window),
   **not** about a transformer **impedance parameter** delta. Conflating a
   parameter discrepancy with the response-accuracy criterion is exactly the
   imprecision a judge catches. **Fix:** cite §4.8 for the impedance-change duty;
   cite §6.2.1 only in the recommended action (a sensitivity run must keep model
   *response* within tolerance).

3. **Impedance 10% / 5% thresholds are R1GPT triage thresholds, not PSMG
   limits.** The finding text currently presents them as if they were PSMG-stated
   limits. **Fix:** label them explicitly as R1GPT materiality thresholds.

4. **SCR > 10 "exemption" is too absolute.** `model_adequacy.ts` says §3.4
   *"exempts plant with SCR > 10 from EMT model requirements"* and `clause.ts`
   echoes it. In practice a high SCR may *reduce EMT modelling scope* subject to
   AEMO's system-strength assessment — it is not an automatic exemption at a
   single hard number. **Fix:** soften to a rule-of-thumb phrasing and do not
   claim a hard cutoff.

5. **IEC 60909 edition (§4.2).** Confirm the edition year (`2016`) against the
   PDF — IEC 60909 has multiple editions and the wrong year is an easy catch.

## Float-boundary note (robustness)

The impedance-delta comparison in `delta.ts` uses raw floating-point division
(`Math.abs(fatZ − gpsZ) / gpsZ`). At exact boundaries (e.g. a 5.00% or 10.00%
delta) floating-point noise can tip the value just over the threshold and change
the severity. *Recommended fix:* round the delta to ~4 decimal places before the
`> 0.1` / `> 0.05` comparisons so the triage boundaries are deterministic. (This
behaviour was observed in a stress run — see `STRESS_TEST.md`.)
