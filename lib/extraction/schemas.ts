import { z } from "zod";

const nn = () => z.number().nullable();

export const GPSBaselineSchema = z.object({
  clauses: z.array(z.string()).default([]),
  transformer_impedance_pu: nn(),
  zero_sequence_impedance_pu: nn(),
  fault_level_mva: nn(),
  scr: nn(),
  emt_model_required: z.boolean().default(false),
  rms_model_provided: z.boolean().default(false),
  harmonic_filter_referenced: z.boolean().default(false),
  block_diagrams_included: z.boolean().default(false),
  rug_referenced: z.boolean().default(false),
  active_power_recovery_ms: nn(),
  nsp: z.string().nullable(),
  connection_voltage_kv: nn(),
  agreed_gps_date: z.string().nullable(),
  technology_type: z
    .enum(["wind", "solar", "BESS", "hybrid", "synchronous"])
    .nullable(),
  capacity_mw: nn(),
});

export const FATReportSchema = z.object({
  transformer_impedance_pu: nn(),
  zero_sequence_impedance_pu: nn(),
  tap_changer_positions: z.array(z.number()).default([]),
  test_date: z.string().nullable(),
  firmware_version: z.string().nullable(),
  filter_design_included: z.boolean().default(false),
  block_diagrams_provided: z.boolean().default(false),
  rug_provided: z.boolean().default(false),
});

export const OEMMetadataSchema = z.object({
  vendor: z.string().nullable(),
  model_name: z.string().nullable(),
  firmware_version: z.string().nullable(),
  dmat_baseline_version: z.string().nullable(),
  known_issues: z.array(z.string()).default([]),
  emt_model_tool: z
    .enum(["PSCAD", "PowerFactory", "PSSE", "other"])
    .nullable(),
  rms_model_tool: z.enum(["PSSE", "PowerFactory", "other"]).nullable(),
});
