import { z } from "zod";

// high = risicovol (rood), medium = aandachtspunt (geel), low = in orde / kleine opmerking (groen)
export const severitySchema = z.enum(["high", "medium", "low"]);
export type Severity = z.infer<typeof severitySchema>;

export const findingSchema = z.object({
  id: z.string().min(1),
  severity: severitySchema,
  title: z.string().min(1),
  category: z.string().min(1),
  clause: z.string().min(1).describe("Letterlijk citaat van de clausule uit het contract"),
  location: z.string().nullable().describe("Artikel- of paginaverwijzing, bijv. 'Artikel 7.2'"),
  explanation: z.string().min(1),
  suggestion: z.string().min(1).describe("Concreet verbetervoorstel of alternatieve formulering"),
});
export type Finding = z.infer<typeof findingSchema>;

export const fullReportSchema = z.object({
  safetyScore: z.number().int().min(0).max(100),
  verdict: z.string().min(1),
  summary: z.string().min(1),
  contractType: z.string().min(1),
  findings: z.array(findingSchema),
  missingClauses: z.array(
    z.object({
      title: z.string().min(1),
      why: z.string().min(1),
    }),
  ),
  negotiationTips: z.array(z.string().min(1)),
});
export type FullReport = z.infer<typeof fullReportSchema>;

// Stored in documents.teaser and readable before payment. It deliberately holds no clause
// text, explanations or suggestions — only enough to show what the full report contains.
export const teaserSchema = z.object({
  safetyScore: z.number().int().min(0).max(100),
  verdict: z.string().min(1),
  contractType: z.string().min(1),
  counts: z.object({
    high: z.number().int().min(0),
    medium: z.number().int().min(0),
    low: z.number().int().min(0),
  }),
  findings: z.array(
    z.object({
      severity: severitySchema,
      title: z.string().min(1),
    }),
  ),
});
export type Teaser = z.infer<typeof teaserSchema>;

export function toTeaser(report: FullReport): Teaser {
  const count = (s: Severity) => report.findings.filter((f) => f.severity === s).length;
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return {
    safetyScore: report.safetyScore,
    verdict: report.verdict,
    contractType: report.contractType,
    counts: { high: count("high"), medium: count("medium"), low: count("low") },
    findings: [...report.findings]
      .sort((a, b) => order[a.severity] - order[b.severity])
      .map(({ severity, title }) => ({ severity, title })),
  };
}

export type AnalyzeRequest = { storagePath: string; fileName: string; fileSize: number };
export type AnalyzeResponse = { documentId: string } | { error: string };

export type CheckoutPlan = "report" | "pro";
export type CheckoutRequest = { documentId: string; plan: CheckoutPlan };
export type CheckoutResponse = { url: string } | { error: string };
