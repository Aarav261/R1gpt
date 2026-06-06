import OpenAI from "openai";
import { Finding } from "@/types/report";

const RFI_SYSTEM_PROMPT = `You are a senior power systems engineer at an Australian NSP writing a
formal Request for Information letter during R1 assessment. You have AEMO's
Power System Model Guidelines v3.0 (September 2025) open in front of you.

Key PSMG requirements to cite in questions:
- Section 4.1: Load flow model must include winding impedances (positive,
  negative and zero sequence), tap ranges and grounding arrangements
- Section 4.2: Short circuit data to IEC 60909:2016 required
- Section 4.3: EMT models required for IBR plant where SCR concerns exist
- Section 4.6.1: Harmonic models must provide frequency-dependent Norton
  equivalents and harmonic current injection profiles per loading level
- Section 4.8: Any firmware or control system change that materially affects
  model accuracy requires re-validation before registration
- Section 5.2.2: Transfer function block diagrams mandatory alongside all
  RMS models — black-box approach for individual blocks not acceptable
- Section 6.2.1: Model responses must be within 10% of actual plant response
  for 95% of samples within the transient window
- Section 6.4: Non-conformance may result in operational constraints imposed
  until modelling issue is resolved

Generate 3-7 RFI questions in formal AEMO/NSP letter style. Each question:
- Cites the specific PSMG section or NER clause
- References the specific document or field that triggered the question
- Is answerable with a specific document submission or model update
- Uses formal engineering language as AEMO actually writes

Return ONLY a JSON array of strings. No preamble, no explanation.`;

/** PSMG-grounded deterministic fallback questions derived from findings. */
function fallbackQuestions(findings: Finding[]): string[] {
  const out: string[] = [];
  for (const f of findings.slice(0, 6)) {
    if (!f.psmg_ref) continue;
    out.push(
      `With reference to PSMG ${f.psmg_ref.split(" — ")[0]}, please address the following: ${f.title}. Provide supporting documentation confirming ${f.recommended_action.replace(/\.$/, "")}.`
    );
  }
  return out.length
    ? out
    : [
        "Please confirm that all submitted models comply with PSMG v3.0 Section 4.1 (winding impedances) and Section 6.2.1 (10% accuracy criteria).",
      ];
}

function stripFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function generateRFIs(
  openai: OpenAI,
  findings: Finding[],
  project_name: string,
  technology_type: string | null
): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RFI_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            findings: findings.map((f) => ({
              finding_id: f.finding_id,
              title: f.title,
              psmg_ref: f.psmg_ref,
              source_document: f.source_document,
              source_field: f.source_field,
              severity: f.severity,
            })),
            project_name,
            technology_type,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(stripFences(content));

    // response_format json_object guarantees an object; accept array or
    // { questions: [...] } / { rfi_questions: [...] } shapes.
    let arr: unknown = parsed;
    if (!Array.isArray(parsed)) {
      arr =
        parsed.questions ??
        parsed.rfi_questions ??
        parsed.rfis ??
        Object.values(parsed)[0];
    }

    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
      return arr as string[];
    }
  } catch (err) {
    console.error("[rfi] generation failed, using fallback", err);
  }

  return fallbackQuestions(findings);
}
