# Citation register — PSMG v3.0 & NER S5.2

> **Status.** This describes citations **as they exist in the code today**. The
> five internal inconsistencies previously listed under "Known inconsistencies"
> are now **fixed** (see that section). What remains is verification: the
> `CONFIRM` rows still need a line-check against the controlled PSMG v3.0 PDF.

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
| §3.4 | High SCR may *reduce* EMT modelling scope (rule of thumb ~>10), subject to AEMO system-strength assessment — not an automatic exemption | `model_adequacy.ts` (MADQ-003), `clause.ts` (S5.2.5.15 note) | FIXED ✓ (softened) |
| §4.1 | Load-flow model inclusions — winding impedances (pos/neg/zero seq), taps, grounding (Table 4) | `clause.ts`, `rfi.ts`, upload UI | CONFIRM |
| §4.2 | Short-circuit / fault-level data to IEC 60909:2016 | `clause.ts`, `rfi.ts`, upload UI | CONFIRM |
| §4.3 | RMS and EMT stability model requirements; EMT for IBR where system strength is a concern | `clause.ts`, `model_adequacy.ts`, `rfi.ts` | CONFIRM |
| §4.3.2 | Frequency-control model requirements | `clause.ts` | CONFIRM |
| §4.6.1 | Harmonic emissions — frequency-dependent Norton equivalents + injection profiles per loading level | `evidence.ts`, `clause.ts`, `rfi.ts` | CONFIRM |
| §4.8 | Model/plant updates (firmware, control changes) require re-validation before registration | `delta.ts`, `firmware.ts`, `nsp.ts`, `rfi.ts` | CONFIRM |
| §5.1 | Releasable User Guide is a mandatory submission artefact | `evidence.ts` | CONFIRM |
| §5.2.2 | Transfer-function block diagrams mandatory for RMS models; black-box blocks not acceptable | `evidence.ts`, `model_adequacy.ts`, `clause.ts`, `rfi.ts` | CONFIRM |
| §6.2.1 | Model response within 10% of actual for 95% of samples in the transient window | `delta.ts` (cited only in DELTA-001 recommended actions), `rfi.ts` | FIXED ✓ (no longer mislabelled on the impedance parameter) |
| §6.3 | Model validation and confirmation | `clause.ts` (S5.2.8) | FIXED ✓ (removed from DELTA-001; §4.8/§6.4 cited instead) |
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

## Known inconsistencies — now fixed

These were concrete, catchable bugs. All five are resolved in the code:

1. **DELTA-001 (>10% branch) — `psmg_ref` ≠ description.** ✓ FIXED. `psmg_ref`,
   description and action now agree: §4.8 (a changed model must be re-validated)
   as the primary duty and §6.4 as the consequence. §6.3 was removed.

2. **DELTA-001 (>5% branch) — §6.2.1 mislabelled.** ✓ FIXED. The impedance-change
   duty now cites §4.8; §6.2.1 (model-response accuracy) is cited only in the
   recommended sensitivity-run action.

3. **Impedance 10% / 5% thresholds are R1GPT triage thresholds, not PSMG
   limits.** ✓ FIXED. Both branches now state explicitly that 10%/5% are R1GPT
   materiality thresholds, not PSMG-stated limits.

4. **SCR > 10 "exemption" is too absolute.** ✓ FIXED. `model_adequacy.ts` and
   `clause.ts` now phrase it as a rule of thumb (~>10) that *may reduce EMT
   modelling scope* subject to AEMO's system-strength assessment — no hard
   cutoff or automatic exemption.

5. **IEC 60909 edition (§4.2).** ⚠️ STILL OPEN. The edition year (`2016`) is a
   plausible-but-unverified `CONFIRM` — line-check it against the PDF before any
   pitch.

## Float-boundary note (robustness) — fixed

The impedance-delta comparison in `delta.ts` previously used raw floating-point
division (`Math.abs(fatZ − gpsZ) / gpsZ`), so an exact 5.00% / 10.00% delta could
be tipped just over the threshold by floating-point noise. ✓ FIXED: the delta is
now rounded to 4 decimal places before the `> 0.1` / `> 0.05` comparisons, making
the triage boundaries deterministic. The committed stress harness asserts this
(`npm run stress`, "exact 5.00% / 10.00% delta" checks) — see `STRESS_TEST.md`.
