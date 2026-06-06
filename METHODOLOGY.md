# Scoring methodology — what the number is, and what it must not claim

> **Status of this document.** The reframe described under "Proposed reframe" is
> now **applied** in `lib/scoring/engine.ts`: the score is a deterministic
> readiness index (0–100), the sigmoid / confidence interval / month percentiles
> are gone, and the weights are exposed as a transparent rubric. Section 1 below
> is retained as the historical record of what the code *used* to do and why it
> was attackable.

This is the single most attackable surface in R1GPT. A NEM-literate judge — or a
chartered power-systems engineer evaluating a purchase — will probe every number
on screen. The defensible position is narrow and we should hold it exactly:

- **Deterministic ≠ calibrated.** The pipeline is reproducible (same documents →
  same output). That is *not* the same as the score being a calibrated estimate
  of AEMO's decision. Reproducible arithmetic over fabricated weights is still
  fabricated.
- The honest product is the **evidence chain** (a specific number-vs-number
  contradiction tied to an exact PSMG/NER citation), not the headline score.

## 1. Former implementation (historical — replaced by the reframe)

This is what the code did *before* the reframe landed, kept here so the
attack surface is documented. The current `lib/scoring/engine.ts` no longer
implements any of §1.1–§1.4.

### 1.1 Severity penalties
```
SEVERITY_PENALTY = { low: 0.04, medium: 0.12, high: 0.25, dmat_triggering: 0.45 }
```
Each finding contributes its penalty; they are summed.

### 1.2 Approval probability
```
raw       = max(0, 1 − Σ penalty)
squeezed  = 1 / (1 + e^(−6·(raw − 0.5)))      // sigmoid
approval  = round(squeezed · 100) / 100        // 0..1, 2dp
```

### 1.3 Confidence interval
```
spread = max(0.05, 0.15 − findingCount · 0.01)
CI     = [approval − spread, approval + spread]   // clamped to [0.01, 0.99]
```

### 1.4 Time to approval (months)
```
hasDMAT          → { p10: 8,  p50: 14, p90: 24 }
highCount ≥ 3    → { p10: 5,  p50: 10, p90: 18 }
highCount ≥ 1    → { p10: 3,  p50: 7,  p90: 13 }
otherwise        → { p10: 1,  p50: 3,  p90: 6  }
```

### 1.5 Materiality class
Worst severity present → `low | medium | high | dmat_triggering`. This one is
defensible: it is a transparent max() over severities, claims nothing
probabilistic, and is the part worth keeping front-and-centre.

## 2. Where this is indefensible (the kill-shots)

| Artifact | Why a judge destroys it |
|----------|-------------------------|
| **"Calibrated" approval probability** | There is no calibration dataset. AEMO does not publish R1 outcomes at clause granularity, so the sigmoid and the 0.04/0.12/0.25/0.45 weights are fitted to *nothing*. "Calibrated" is falsifiable in ten seconds. |
| **Confidence interval** | `spread = 0.15 − findingCount·0.01` is a fabricated constant. A CI implies a sampling distribution that does not exist. |
| **Sigmoid squeeze** `−6·(raw−0.5)` | The −6 is arbitrary. It manufactures false precision and pushes scores toward 0/100 for visual drama, not statistical reason. |
| **Time-to-approval P10/P50/P90 months** | "Why 14 months median?" has no answer. The buckets have zero empirical basis. |

## 3. The reframe (APPLIED)

The reframe cost nothing in real value and removed every kill-shot above. As
implemented in `lib/scoring/engine.ts`:

1. **Deterministic "readiness index".** "Calibrated" is gone, the confidence
   interval is gone, and the sigmoid is replaced with plain subtraction the user
   can read:
   ```
   readiness = clamp(0 .. CEILING, CEILING − Σ severity_weight)
   CEILING = 95                                                     // CHECKLIST_CEILING
   severity_weight = { low: 4, medium: 12, high: 25, dmat_triggering: 45 }   // SEVERITY_WEIGHT
   ```
   The UI states plainly: *"a severity-weighted readiness ranking — illustrative,
   not a forecast of AEMO's decision."*

   **The index never reaches 100, by design.** Passing every R1GPT check means
   "nothing in our finite checklist fired" — not proof of completeness. The
   reserved 5-point headroom stands for the chartered-engineer review we can't
   automate, so the tool refuses to print a perfect score. The index also
   **saturates at 0**: a badly-failing submission floors out and stops
   discriminating, which is fine because the signal there is the findings list,
   not the number. Both rails are kept honest by the coverage line (§4).

2. **Weights exposed as a transparent triage rubric** (`SEVERITY_WEIGHT`), not a
   hidden formula.

3. **Month percentiles replaced with a qualitative RFI-cycle risk band**
   (minimal → elevated → high → severe), via `computeRfiCycleRisk`, each band
   carrying a one-line rationale. The acceptable qualitative claim
   (*"DMAT-triggering findings historically add multiple RFI cycles"*) is the
   `severe`-band rationale.

4. **Score demoted in the UI.** The gauge tops out at 95, drops the CI line, and
   carries the "illustrative, not a forecast" disclaimer; the demo script leads
   with the evidence chain.

The committed stress harness (`npm run stress`) asserts the readiness invariants
(clean → caps at 95, adding a finding never raises the score, severe stacks
floor at 0, range [0,95], determinism) — see `STRESS_TEST.md`.

## 4. The coverage line — why neither rail is a bare number

A 100 reads as "guaranteed", a 0 as "hopeless"; both overclaim. The fix is to
never show the index alone. Every report carries an **"X of N checks passed"**
line beside the gauge, where the six assessors are the checks and N counts only
the assessors that were *applicable* (had the inputs they need — the impedance
delta is not counted if no FAT was uploaded). So:

- The passing demo reads **95 · 6 of 6 checks passed** — high, but explicitly
  "everything we can check passed", not "perfect".
- A failing submission reads **0 · 2 of 6 checks passed** — the 0 is explained
  by *which* checks fired, not presented as a precise score.

`AuditReport.checks: CheckResult[]` (built in `lib/assessors/runner.ts`) is the
full per-assessor breakdown; the UI summarises it as the coverage line.

## 5. The one sentence to rehearse

> "It's a severity-weighted **readiness index**, not a probability. It caps at 95
> because passing every check isn't proof of completeness, and it ranks what to
> fix first against the exact PSMG clause AEMO would cite — it does not predict
> AEMO's decision, and we don't claim it does."
