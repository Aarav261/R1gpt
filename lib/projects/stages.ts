/**
 * Canonical, ordered list of AEMO connection-process stages.
 *
 * Stored on `projects.aemo_stage` as plain text (no pgEnum) so the list can
 * evolve without a DB migration — mirroring the `document_type` convention.
 * The Overview pipeline widget maps a project's current stage index over this
 * ordered list (stages before it = done, the stage = active, after = pending).
 */
export const AEMO_STAGES = [
  "enquiry",
  "application",
  "r1_assessment",
  "r2_assessment",
  "offer",
  "registration",
] as const;

export type AemoStage = (typeof AEMO_STAGES)[number];

/** Human-readable label for each stage. */
export const AEMO_STAGE_LABELS: Record<AemoStage, string> = {
  enquiry: "Connection Enquiry",
  application: "Connection Application",
  r1_assessment: "R1 Capability Assessment",
  r2_assessment: "R2 Detailed Assessment",
  offer: "Connection Offer",
  registration: "Registration",
};

/** Index of a stage in the ordered list, or -1 if unknown/unset. */
export function stageIndex(stage: string | null | undefined): number {
  if (!stage) return -1;
  return AEMO_STAGES.indexOf(stage as AemoStage);
}

/** Type guard for a valid stage string. */
export function isAemoStage(value: string): value is AemoStage {
  return (AEMO_STAGES as readonly string[]).includes(value);
}
