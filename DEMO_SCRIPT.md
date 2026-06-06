# Demo script — lead with the evidence chain

The goal of the demo is to land one moment: *"this isn't ChatGPT."* That moment
is a specific **number-vs-number contradiction tied to an exact regulatory
citation** — not an animated gauge. Structure the five minutes around the
evidence chain and treat the score as a footnote.

## Cut / open

- **CUT:** the approval-probability gauge animation. It is the most attackable
  five seconds in the demo and adds no defensible information (see
  `METHODOLOGY.md`). If the UI still shows it, scroll past it.
- **OPEN WITH:** a single finding card — **DELTA-001**, the impedance delta —
  showing **FAT-measured 0.138 pu vs GPS-design 0.120 pu**, traced to the exact
  source field (`fat_report.transformer_impedance_pu`), citing the PSMG section,
  flagged DMAT-triggering. Lead with the evidence chain, not the score.

## The 5-minute flow

1. **Frame the problem (20s).** "Australia's generator-connection queue is
   throttled by slow, iterative R1 model-acceptance reviews. Proponents submit
   packages that fail predictable, clause-level checks they could have caught
   beforehand. We catch them first."
2. **Run the audit on the Ironbark package (30s).** Let the streaming pipeline
   show extraction → assessment → findings. Don't dwell on the score event.
3. **The hero moment — DELTA-001 (90s).** Open the finding card. Walk the chain
   out loud: *as-designed 0.120 pu → as-built 0.138 pu → that's a material change
   → §4.8 says a changed model must be re-validated → here's the exact field it
   came from.* "A general LLM gives you prose opinions. This gives you the exact
   clause AEMO will cite, with the number that triggers it."
4. **The clause scorecard + predicted RFIs (90s).** Show pass/partial/missing per
   NER S5.2 clause, then the predicted RFI letter text. "This is the RFI AEMO
   will send you — pre-empt it instead of discovering it in 9 months."
5. **Close on the queue (30s).** "We attack the binding constraint on the
   renewable build-out — the RFI cycle — with a human engineer still in the
   loop." (Keep grid impact qualitative; see `LIMITATIONS.md` §6.)

## If you keep only one differentiator

Of (a) PDF extraction, (b) approval-probability scoring, (c) PSMG-cited predicted
RFIs — **keep (c)**, fused with the clause scorecard. It is what a consultant
would actually pay for and the hardest thing for a generic ChatGPT session to
produce reliably with correct citations. Extraction is plumbing; scoring is the
liability. Lead with the RFI + evidence chain.

## Q&A — the kill-shots and how to answer

| Likely question | Answer |
|-----------------|--------|
| *"Is the approval probability calibrated?"* | "No — and we don't call it that. It's a deterministic, severity-weighted **readiness index**: a ranking of what to fix first, not odds with AEMO. AEMO publishes no clause-level outcomes to calibrate against, so we don't pretend to." (See `METHODOLOGY.md`. Reframe is recommended in code — be ready either way.) |
| *"Why is the median time 14 months?"* | "Those percentiles have no empirical anchor and should be dropped — we're replacing them with a qualitative RFI-cycle risk band. What's defensible: DMAT-triggering findings historically add multiple RFI cycles." |
| *"Run it on a real submission you didn't write."* | "The fixtures are synthetic — we say so. The honest demo is to run extraction on a redacted real artifact and let it partially fail; watch the Zod safety net catch it." (See `STRESS_TEST.md` / `LIMITATIONS.md` §3.) Don't claim generalisation you can't show. |
| *"Is that PSMG section number exact?"* | "Every citation is in `CITATIONS.md` with a verification status. We're line-checking against the controlled PSMG v3.0 PDF before launch; a few thresholds (SCR>10) are deliberately phrased as rules of thumb." |
| *"How is this not just ChatGPT with a prompt?"* | "The extraction layer *is* an LLM and we don't hide that. The value is the deterministic assessment on top: the same documents always yield the same findings and the same exact-clause citations — reproducible, auditable, and tied to specific document fields." |

## Numbers to never say out loud

- "**Calibrated**" — drop it entirely.
- "**X% ± Y% confidence interval**" — there is no sampling distribution.
- "**P50 = 14 months**" — no basis. Use the qualitative band.
- Any "**MW unlocked**" / "**tCO₂ abated**" figure — greenwashing without a
  counterfactual. Keep grid impact qualitative.
