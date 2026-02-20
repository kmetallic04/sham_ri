import { z } from "zod";

const metricScore = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const sessionAnalysisSchema = z.object({
  summary: z
    .string()
    .min(1, "Summary is required")
    .describe("A 3-sentence summary of the session"),

  content_coverage_score: metricScore.describe(
    "1 = Missed, 2 = Partial, 3 = Complete"
  ),
  content_coverage_justification: z
    .string()
    .min(1)
    .describe("Why this content coverage score was given"),

  facilitation_quality_score: metricScore.describe(
    "1 = Poor, 2 = Adequate, 3 = Excellent"
  ),
  facilitation_quality_justification: z
    .string()
    .min(1)
    .describe("Why this facilitation quality score was given"),

  protocol_safety_score: metricScore.describe(
    "1 = Violation, 2 = Minor Drift, 3 = Adherent"
  ),
  protocol_safety_justification: z
    .string()
    .min(1)
    .describe("Why this protocol safety score was given"),

  risk_flag: z.enum(["SAFE", "RISK"]).describe(
    "SAFE if no crisis indicators detected, RISK if self-harm or severe crisis indicators are present"
  ),
  risk_quotes: z
    .array(z.string())
    .default([])
    .describe(
      "Exact quotes from the transcript that triggered the RISK flag. Empty array if SAFE."
    ),
});

export type SessionAnalysis = z.infer<typeof sessionAnalysisSchema>;

export const contentCoverageLabels: Record<number, string> = {
  1: "Missed",
  2: "Partial",
  3: "Complete",
};

export const facilitationQualityLabels: Record<number, string> = {
  1: "Poor",
  2: "Adequate",
  3: "Excellent",
};

export const protocolSafetyLabels: Record<number, string> = {
  1: "Violation",
  2: "Minor Drift",
  3: "Adherent",
};
