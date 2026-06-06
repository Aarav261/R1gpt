/**
 * R1GPT deterministic stress harness — no OpenAI key required.
 *
 * Exercises the deterministic core (Zod validation + assessors + scoring) with
 * adversarial and boundary input. Targets the readiness-index API
 * (computeReadinessIndex / computeRfiCycleRisk). Run with: npm run stress
 */
import {
  DocumentType,
  GPSBaseline,
  FATReport,
  OEMMetadata,
  UploadedDocument,
} from "@/types/documents";
import { Severity } from "@/types/report";
import { runAssessors } from "@/lib/assessors/runner";
import {
  computeReadinessIndex,
  computeRfiCycleRisk,
} from "@/lib/scoring/engine";
import {
  GPSBaselineSchema,
  FATReportSchema,
  OEMMetadataSchema,
} from "@/lib/extraction/schemas";

let passed = 0,
  failed = 0;
const failures: string[] = [];
const check = (n: string, c: boolean, d = "") => {
  if (c) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${n}`);
  } else {
    failed++;
    failures.push(n + (d ? ` — ${d}` : ""));
    console.log(`  \x1b[31m✗ ${n}\x1b[0m${d ? ` — ${d}` : ""}`);
  }
};
const section = (t: string) => console.log(`\n\x1b[1m${t}\x1b[0m`);

const cleanGPS = (o: Partial<GPSBaseline> = {}): GPSBaseline => ({
  clauses: [],
  transformer_impedance_pu: 0.12,
  zero_sequence_impedance_pu: 0.1,
  fault_level_mva: 2000,
  scr: 15,
  emt_model_required: true,
  rms_model_provided: true,
  harmonic_filter_referenced: true,
  block_diagrams_included: true,
  rug_referenced: true,
  active_power_recovery_ms: 100,
  nsp: "Transgrid",
  connection_voltage_kv: 330,
  agreed_gps_date: "2026-03-01",
  technology_type: "solar",
  capacity_mw: 400,
  ...o,
});
const cleanFAT = (o: Partial<FATReport> = {}): FATReport => ({
  transformer_impedance_pu: 0.12,
  zero_sequence_impedance_pu: 0.1,
  tap_changer_positions: [1, 2],
  test_date: "2026-04-01",
  firmware_version: "2.1.0",
  filter_design_included: true,
  block_diagrams_provided: true,
  rug_provided: true,
  ...o,
});
const cleanOEM = (o: Partial<OEMMetadata> = {}): OEMMetadata => ({
  vendor: "Sungrow",
  model_name: "SG-X",
  firmware_version: "2.1.0",
  dmat_baseline_version: "2.1.0",
  known_issues: [],
  emt_model_tool: "PSCAD",
  rms_model_tool: "PSSE",
  ...o,
});
const doc = (
  t: DocumentType,
  e: GPSBaseline | FATReport | OEMMetadata | null
): UploadedDocument => ({
  doc_type: t,
  filename: `${t}.pdf`,
  raw_text: "x",
  extracted: e,
});

async function main() {
  console.log(
    "\n\x1b[1mR1GPT deterministic stress harness\x1b[0m (no OpenAI key required)"
  );

  section("1. Zod safety net");
  check("rejects non-object", !GPSBaselineSchema.safeParse("nope").success);
  check(
    "rejects string impedance",
    !GPSBaselineSchema.safeParse({ transformer_impedance_pu: "0.12" }).success
  );
  check(
    "rejects bad technology_type",
    !GPSBaselineSchema.safeParse(
      cleanGPS({ technology_type: "fusion" as never })
    ).success
  );
  check(
    "rejects bad emt_model_tool",
    !OEMMetadataSchema.safeParse(cleanOEM({ emt_model_tool: "ETAP" as never }))
      .success
  );
  check("accepts clean GPS", GPSBaselineSchema.safeParse(cleanGPS()).success);
  check("accepts clean FAT", FATReportSchema.safeParse(cleanFAT()).success);
  check("accepts clean OEM", OEMMetadataSchema.safeParse(cleanOEM()).success);

  section("2. Graceful degradation");
  let threw = false;
  try {
    await runAssessors([]);
  } catch {
    threw = true;
  }
  check("empty submission does not throw", !threw);
  const empty = (await runAssessors([])).findings;
  check(
    "empty → only LOW 'missing' findings",
    empty.every((f) => f.severity === Severity.LOW),
    `got ${empty.map((f) => f.severity).join(",")}`
  );
  let nullThrew = false;
  try {
    await runAssessors([
      doc(DocumentType.GPS_BASELINE, null),
      doc(DocumentType.FAT_REPORT, null),
      doc(DocumentType.OEM_METADATA, null),
    ]);
  } catch {
    nullThrew = true;
  }
  check("null-extraction does not throw", !nullThrew);

  section("3. Impedance-delta boundaries (FP-rounding fixed)");
  for (const [z, expect] of [
    [0.12, null],
    [0.127, Severity.HIGH],
    [0.138, Severity.DMAT_TRIGGERING],
  ] as const) {
    const f = (
      await runAssessors([
        doc(DocumentType.GPS_BASELINE, cleanGPS()),
        doc(DocumentType.FAT_REPORT, cleanFAT({ transformer_impedance_pu: z })),
      ])
    ).findings.find((x) => x.finding_id === "DELTA-001");
    if (expect === null)
      check(`z=${z} → no finding`, !f, f ? `got ${f.severity}` : "");
    else
      check(`z=${z} → ${expect}`, f?.severity === expect, `got ${f?.severity ?? "none"}`);
  }
  // Exact-boundary determinism: the 4dp rounding makes the thresholds exclusive.
  const exact5 = (
    await runAssessors([
      doc(DocumentType.GPS_BASELINE, cleanGPS()),
      doc(DocumentType.FAT_REPORT, cleanFAT({ transformer_impedance_pu: 0.126 })),
    ])
  ).findings.find((x) => x.finding_id === "DELTA-001");
  check("exact 5.00% delta → no finding (boundary exclusive)", !exact5, exact5 ? `got ${exact5.severity}` : "");
  const exact10 = (
    await runAssessors([
      doc(DocumentType.GPS_BASELINE, cleanGPS()),
      doc(DocumentType.FAT_REPORT, cleanFAT({ transformer_impedance_pu: 0.132 })),
    ])
  ).findings.find((x) => x.finding_id === "DELTA-001");
  check(
    "exact 10.00% delta → HIGH not DMAT (boundary exclusive)",
    exact10?.severity === Severity.HIGH,
    `got ${exact10?.severity ?? "none"}`
  );

  section("4. Scoring invariants (readiness API)");
  check(
    "clean → readiness caps at ceiling 95 (never 100)",
    computeReadinessIndex([]) === 95
  );
  const oneMed = [{ severity: Severity.MEDIUM }] as never;
  const twoMed = [
    { severity: Severity.MEDIUM },
    { severity: Severity.LOW },
  ] as never;
  check(
    "adding a finding never raises readiness",
    computeReadinessIndex(twoMed) <= computeReadinessIndex(oneMed)
  );
  check(
    "many severe findings floor at 0 (saturates, does not go negative)",
    (() => {
      const r = computeReadinessIndex(
        Array(20).fill({ severity: Severity.DMAT_TRIGGERING }) as never
      );
      return r === 0;
    })()
  );
  check(
    "readiness stays in [0,95]",
    (() => {
      const r = computeReadinessIndex(
        Array(20).fill({ severity: Severity.DMAT_TRIGGERING }) as never
      );
      return r >= 0 && r <= 95;
    })()
  );
  check(
    "DMAT finding → severe RFI-cycle band",
    computeRfiCycleRisk([{ severity: Severity.DMAT_TRIGGERING }] as never).band ===
      "severe"
  );
  check(
    "clean → minimal RFI-cycle band",
    computeRfiCycleRisk([]).band === "minimal"
  );
  const a = await runAssessors([
    doc(DocumentType.GPS_BASELINE, cleanGPS({ block_diagrams_included: false })),
    doc(DocumentType.FAT_REPORT, cleanFAT({ block_diagrams_provided: false })),
  ]);
  const b = await runAssessors([
    doc(DocumentType.GPS_BASELINE, cleanGPS({ block_diagrams_included: false })),
    doc(DocumentType.FAT_REPORT, cleanFAT({ block_diagrams_provided: false })),
  ]);
  check(
    "pipeline deterministic",
    a.findings.length === b.findings.length &&
      computeReadinessIndex(a.findings) === computeReadinessIndex(b.findings)
  );

  // Coverage: a clean full package passes every applicable check; a failing one
  // does not. Inapplicable checks are excluded from the denominator.
  const cleanRun = await runAssessors([
    doc(DocumentType.GPS_BASELINE, cleanGPS()),
    doc(DocumentType.FAT_REPORT, cleanFAT()),
    doc(DocumentType.OEM_METADATA, cleanOEM()),
    doc(DocumentType.PSCAD_REPORT, null),
  ]);
  const cleanApplicable = cleanRun.checks.filter((c) => c.applicable);
  check(
    "clean run → all applicable checks pass",
    cleanApplicable.length > 0 && cleanApplicable.every((c) => c.passed),
    `${cleanApplicable.filter((c) => c.passed).length}/${cleanApplicable.length}`
  );
  // GPS-only: the delta check (needs GPS+FAT) is inapplicable and must not be
  // counted as a pass.
  const gpsOnly = await runAssessors([
    doc(DocumentType.GPS_BASELINE, cleanGPS()),
  ]);
  const deltaCheck = gpsOnly.checks.find((c) => c.name === "delta");
  check(
    "GPS-only → delta check inapplicable, not a pass",
    deltaCheck?.applicable === false && deltaCheck?.passed === false
  );

  section("5. Citation completeness");
  const messy = (
    await runAssessors([
      doc(
        DocumentType.GPS_BASELINE,
        cleanGPS({
          block_diagrams_included: false,
          rug_referenced: false,
          emt_model_required: false,
          scr: null,
          agreed_gps_date: "2024-01-01",
        })
      ),
      doc(
        DocumentType.FAT_REPORT,
        cleanFAT({
          transformer_impedance_pu: 0.138,
          filter_design_included: false,
          block_diagrams_provided: false,
          rug_provided: false,
        })
      ),
      doc(
        DocumentType.OEM_METADATA,
        cleanOEM({ firmware_version: "3.0.0", dmat_baseline_version: "2.1.0" })
      ),
    ])
  ).findings;
  check("messy submission surfaces ≥5 findings", messy.length >= 5);
  check(
    "every finding cites PSMG or NER",
    messy.every((f) => !!f.psmg_ref || !!f.clause)
  );
  check(
    "no unresolved template tokens",
    messy.every(
      (f) => !/\b(undefined|NaN|\[object Object\])\b/.test(f.title + f.description)
    )
  );

  console.log(`\n\x1b[1mResult:\x1b[0m ${passed} passed, ${failed} failed`);
  if (failed) {
    console.log("\x1b[31mFailures:\x1b[0m");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
