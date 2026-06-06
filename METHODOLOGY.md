# Scoring methodology — what the number is, and what it must not claim

> **Status of this document.** It describes the scoring as it exists in the code
> today (`lib/scoring/engine.ts`) **and** proposes a reframe. The reframe is a
> *recommendation only — it is NOT yet applied to the code.* Everything under
> "Proposed reframe" is a to-do, not a description of current behaviour.

This is the single most attackable surface in R1GPT. A NEM-literate judge — or a
chartered power-systems engineer evaluating a purchase — will probe every number
on screen. The defensible position is narrow and we should hold it exactly:

- **Deterministic ≠ calibrated.** The pipeline is reproducible (same documents →
  same output). That is *not* the same as the score being a calibrated estimate
  of AEMO's decision. Reproducible arithmetic over fabricated weights is still
  fabricated.
- The honest product is the **evidence chain** (a specific number-vs-number
  contradiction tied to an exact PSMG/NER citation), not the headline score.

## 1. Current implementation (as coded today)

From `lib/scoring/engine.ts`:

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

## 3. Proposed reframe (RECOMMENDED — not yet applied)

The reframe costs nothing in real value and removes every kill-shot above.

1. **Relabel to a deterministic "readiness index" (0–100).** Drop the word
   *calibrated*. Drop the confidence interval. Replace the sigmoid with plain
   subtraction so the user can read the arithmetic:
   ```
   readiness = max(0, 100 − Σ severity_weight)
   severity_weight = { low: 4, medium: 12, high: 25, dmat_triggering: 45 }
   ```
   State plainly: *"a severity-weighted readiness ranking — it tells you what to
   fix first, not your odds with AEMO."*

2. **Expose the weights as an editable triage rubric**, not a hidden formula.
   "Here are our weights — tune them" is honest and defensible. A hidden sigmoid
   posing as science is not.

3. **Replace the month percentiles with a qualitative RFI-cycle risk band**
   (minimal → elevated → high → severe). If a number is wanted, anchor it to a
   *public* AEMO/CEC connection-timeframe statistic and show relative
   improvement — never invent percentiles. Acceptable qualitative claim:
   *"DMAT-triggering findings historically add multiple RFI cycles."*

4. **Demote the score in the UI.** Lead with the evidence chain; put the index
   in a footnote section labelled "illustrative, not a forecast."

See `lib/scoring/engine.ts` for where each change lands, and `DEMO_SCRIPT.md`
for how to present the reframed version. A worked stress-test of a deterministic
readiness index (including edge cases the reframe must handle) is in
`STRESS_TEST.md`.

## 4. The one sentence to rehearse

> "It's a severity-weighted **readiness index**, not a probability. It ranks
> what to fix first against the exact PSMG clause AEMO would cite — it does not
> predict AEMO's decision, and we don't claim it does."
