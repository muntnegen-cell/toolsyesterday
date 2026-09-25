import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { env } from "@/lib/env";
import { UserFacingError } from "@/lib/errors";
import { fullReportSchema, type FullReport, type Severity } from "@/types/analysis";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";

export type ContractInput = { kind: "text"; text: string } | { kind: "pdf"; base64: string };

// Models documented to accept `fallbacks: "default"`; others run without server-side fallback.
const DEFAULT_FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5", "claude-fable-5-1"]);

// Plain JSON-schema format (not the auto-parsing helper) so stop_reason is checked before parsing:
// the SDK's auto-parse would throw on the empty text of a refusal before we could see it.
const OUTPUT_FORMAT = { type: "json_schema" as const, schema: betaZodOutputFormat(fullReportSchema).schema };

let client: Anthropic | undefined;
function getClient() {
  // Stay under the route's 300 s maxDuration so a hung call still marks the document as failed.
  client ??= new Anthropic({ apiKey: env.anthropic().ANTHROPIC_API_KEY, timeout: 200_000, maxRetries: 1 });
  return client;
}

function buildContent(input: ContractInput, fileName: string): BetaContentBlockParam[] {
  const instruction: BetaContentBlockParam = { type: "text", text: userPrompt(fileName) };
  if (input.kind === "pdf") {
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.base64 } },
      instruction,
    ];
  }
  return [{ type: "text", text: `<contract>\n${input.text}\n</contract>` }, instruction];
}

async function requestReport(input: ContractInput, fileName: string, model: string): Promise<FullReport> {
  const fallback = DEFAULT_FALLBACK_MODELS.has(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};

  const stream = getClient().beta.messages.stream({
    model,
    max_tokens: 32_000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: OUTPUT_FORMAT },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildContent(input, fileName) }],
    ...fallback,
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new UserFacingError("Dit document kon niet automatisch worden geanalyseerd.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new RetryableAnalysisError("Output truncated at max_tokens");
  }
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new RetryableAnalysisError("Response was not valid JSON");
  }
  const parsed = fullReportSchema.safeParse(json);
  if (!parsed.success) {
    throw new RetryableAnalysisError(`Response failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

class RetryableAnalysisError extends Error {}

// Enum and range constraints are enforced by our Zod check, not by the API, so a mismatch is worth one retry.
function isRetryable(err: unknown) {
  return err instanceof RetryableAnalysisError;
}

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function normalize(report: FullReport): FullReport {
  const findings = [...report.findings]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((f, i) => ({ ...f, id: `f${i + 1}` }));
  return { ...report, findings };
}

export async function analyzeContract(input: ContractInput, fileName: string) {
  const model = env.anthropic().ANTHROPIC_MODEL;
  const started = Date.now();

  try {
    return { report: normalize(await requestReport(input, fileName, model)), model };
  } catch (err) {
    // Only retry when there's still time left inside the route's time budget.
    if (isRetryable(err) && Date.now() - started < 90_000) {
      console.warn("Retrying contract analysis:", err instanceof Error ? err.message : err);
      return { report: normalize(await requestReport(input, fileName, model)), model };
    }
    throw err;
  }
}

export function describeAnalysisError(err: unknown): string {
  if (err instanceof UserFacingError) return err.message;
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
    return "Onze AI-analyse is tijdelijk overbelast. Probeer het over een paar minuten opnieuw.";
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return "De analyse duurde te lang. Probeer het opnieuw of upload een korter document.";
  }
  return "De analyse is mislukt. Probeer het opnieuw.";
}
