import { DocumentType } from "@/types/documents";

export const GPS_EXTRACTION_PROMPT = `You are extracting structured data from a Generator Performance Standards
document for an Australian NEM connection project. These fields correspond
to AEMO Power System Model Guidelines v3.0 (September 2025) requirements.

Return ONLY a valid JSON object with these exact fields:
- clauses: array of NER Schedule 5.2 clause numbers addressed
- transformer_impedance_pu: positive sequence impedance in per-unit
  (PSMG Section 4.1 — winding impedances including positive sequence)
- zero_sequence_impedance_pu: zero sequence impedance in per-unit, or null
  (PSMG Section 4.1 — source impedance including zero sequence)
- fault_level_mva: assumed fault level at connection point in MVA, or null
  (PSMG Section 4.2 — IEC 60909:2016 short circuit data)
- scr: short circuit ratio if stated, or null
  (PSMG Section 3.4 — exemption threshold is SCR > 10)
- emt_model_required: true if EMT model explicitly required or referenced
  (PSMG Section 4.3 — required for IBR when SCR <= 10)
- rms_model_provided: true if RMS model referenced
- harmonic_filter_referenced: true if harmonic filter design is referenced
  (PSMG Section 4.6.1 — mandatory if harmonic filters present)
- block_diagrams_included: true if transfer function block diagrams referenced
  (PSMG Section 5.2.2 — mandatory for all RMS models)
- rug_referenced: true if Releasable User Guide is referenced
  (PSMG Section 5.1 — mandatory submission)
- active_power_recovery_ms: FRT active power recovery time in ms, or null
- nsp: network service provider name, or null
- connection_voltage_kv: connection voltage in kV, or null
- agreed_gps_date: ISO format YYYY-MM-DD, or null
- technology_type: one of wind|solar|BESS|hybrid|synchronous, or null
- capacity_mw: capacity in MW, or null

Do not invent values. Return null for any field not clearly stated.`;

export const FAT_EXTRACTION_PROMPT = `You are extracting structured data from a Factory Acceptance Test report.
Return ONLY a valid JSON object with these exact fields:
- transformer_impedance_pu: measured positive sequence impedance in per-unit
  (PSMG Section 4.1 — actual measured winding impedance)
- zero_sequence_impedance_pu: measured zero sequence impedance, or null
- tap_changer_positions: array of tap changer position values as numbers
- test_date: ISO format YYYY-MM-DD, or null
- firmware_version: inverter or controller firmware version string, or null
- filter_design_included: true if harmonic filter design report included
  (PSMG Section 4.6.1 — Norton equivalents and harmonic profiles required)
- block_diagrams_provided: true if transfer function block diagrams included
  (PSMG Section 5.2.2 — black-box approach not acceptable)
- rug_provided: true if Releasable User Guide is provided or referenced
Do not invent values.`;

export const OEM_EXTRACTION_PROMPT = `You are extracting structured data from an OEM equipment specification sheet.
Return ONLY a valid JSON object with these exact fields:
- vendor: manufacturer name, or null
- model_name: equipment model name or number, or null
- firmware_version: current firmware version string, or null
- dmat_baseline_version: firmware version used for Dynamic Model Acceptance
  Testing, or null (PSMG Section 4.8 — model updates trigger re-validation)
- known_issues: array of any flagged issues, limitations or errata mentioned
- emt_model_tool: one of PSCAD|PowerFactory|PSSE|other, or null
  (PSMG Section 4.3.12 — PSCAD/EMTDC is primary EMT tool)
- rms_model_tool: one of PSSE|PowerFactory|other, or null
  (PSMG Section 4.3.11 — PSS/E is primary RMS tool)
Return empty array for known_issues if none found.`;

export function promptForDocType(docType: DocumentType): string | null {
  switch (docType) {
    case DocumentType.GPS_BASELINE:
      return GPS_EXTRACTION_PROMPT;
    case DocumentType.FAT_REPORT:
      return FAT_EXTRACTION_PROMPT;
    case DocumentType.OEM_METADATA:
      return OEM_EXTRACTION_PROMPT;
    default:
      // PSCAD, connection agreement, RFI history are stored as raw text only.
      return null;
  }
}
