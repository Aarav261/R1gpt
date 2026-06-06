export enum DocumentType {
  GPS_BASELINE = "gps_baseline",
  FAT_REPORT = "fat_report",
  OEM_METADATA = "oem_metadata",
  PSCAD_REPORT = "pscad_report",
  CONNECTION_AGREEMENT = "connection_agreement",
  RFI_HISTORY = "rfi_history",
}

export interface GPSBaseline {
  clauses: string[];
  transformer_impedance_pu: number | null;
  zero_sequence_impedance_pu: number | null;
  fault_level_mva: number | null;
  scr: number | null;
  emt_model_required: boolean;
  rms_model_provided: boolean;
  harmonic_filter_referenced: boolean;
  block_diagrams_included: boolean;
  rug_referenced: boolean;
  active_power_recovery_ms: number | null;
  nsp: string | null;
  connection_voltage_kv: number | null;
  agreed_gps_date: string | null;
  technology_type: "wind" | "solar" | "BESS" | "hybrid" | "synchronous" | null;
  capacity_mw: number | null;
}

export interface FATReport {
  transformer_impedance_pu: number | null;
  zero_sequence_impedance_pu: number | null;
  tap_changer_positions: number[];
  test_date: string | null;
  firmware_version: string | null;
  filter_design_included: boolean;
  block_diagrams_provided: boolean;
  rug_provided: boolean;
}

export interface OEMMetadata {
  vendor: string | null;
  model_name: string | null;
  firmware_version: string | null;
  dmat_baseline_version: string | null;
  known_issues: string[];
  emt_model_tool: "PSCAD" | "PowerFactory" | "PSSE" | "other" | null;
  rms_model_tool: "PSSE" | "PowerFactory" | "other" | null;
}

export type ExtractedModel = GPSBaseline | FATReport | OEMMetadata;

export interface UploadedDocument {
  doc_type: DocumentType;
  filename: string;
  raw_text: string;
  extracted: ExtractedModel | null;
}
