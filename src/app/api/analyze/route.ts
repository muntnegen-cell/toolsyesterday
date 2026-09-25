import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeContract, describeAnalysisError, type ContractInput } from "@/lib/analysis/analyze";
import { env } from "@/lib/env";
import { UserFacingError } from "@/lib/errors";
import { extractPdfText, isPdf } from "@/lib/pdf";
import { MAX_UPLOAD_BYTES } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toTeaser, type AnalyzeResponse } from "@/types/analysis";

export const maxDuration = 300;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const bodySchema = z.object({
  storagePath: z.string().regex(new RegExp(`^${UUID}/${UUID}\\.pdf$`)),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

const LIMITS = {
  freePerUserPerDay: 3,
  freePerIpPerDay: 10,
  proPerUserPerDay: 30,
};
const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 400_000; // ~100k tokens; longer documents are rejected, never silently truncated
const MAX_PAGES = 100;

function json(body: AnalyzeResponse, status = 200) {
  return NextResponse.json(body, { status });
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!ip) return null;
  return createHmac("sha256", env.supabase().SUPABASE_SECRET_KEY).update(ip).digest("hex");
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Ongeldig verzoek." }, 400);
  const { storagePath, fileName, fileSize } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Je sessie is verlopen. Vernieuw de pagina en probeer het opnieuw." }, 401);
  if (!storagePath.startsWith(`${user.id}/`)) return json({ error: "Geen toegang tot dit bestand." }, 403);

  const admin = createAdminClient();

  // Idempotent: a retried request for the same upload returns the existing document.
  const { data: existing } = await admin
    .from("documents")
    .select("id, status")
    .eq("storage_path", storagePath)
    .maybeSingle();
  if (existing && existing.status !== "failed") return json({ documentId: existing.id });

  const ipHash = hashIp(request);
  const limitError = await checkLimits(admin, user.id, ipHash);
  if (limitError) return json({ error: limitError }, 429);

  const { data: file, error: downloadError } = await admin.storage.from("contracts").download(storagePath);
  if (downloadError || !file) return json({ error: "Het bestand is niet gevonden. Upload het opnieuw." }, 404);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES || !isPdf(bytes)) {
    await admin.storage.from("contracts").remove([storagePath]);
    return json({ error: "Dit bestand is geen geldige PDF." }, 422);
  }

  const documentId = await upsertDocument(admin, {
    existingId: existing?.id,
    userId: user.id,
    fileName,
    storagePath,
    fileSize: bytes.byteLength || fileSize,
    ipHash,
  });

  try {
    const input = await prepareInput(bytes);
    const { report, model } = await analyzeContract(input.contract, fileName);
    const teaser = toTeaser(report);

    const { error: reportError } = await admin
      .from("document_reports")
      .upsert({ document_id: documentId, report, model }, { onConflict: "document_id" });
    if (reportError) throw reportError;

    const { error: updateError } = await admin
      .from("documents")
      .update({
        status: "analyzed",
        risk_score: report.safetyScore,
        teaser,
        page_count: input.pages,
        error_message: null,
      })
      .eq("id", documentId);
    if (updateError) throw updateError;

    return json({ documentId });
  } catch (err) {
    if (!(err instanceof UserFacingError)) console.error("Contract analysis failed", { documentId, err });
    const message = describeAnalysisError(err);
    await admin.from("documents").update({ status: "failed", error_message: message }).eq("id", documentId);
    return json({ error: message }, err instanceof UserFacingError ? 422 : 502);
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function checkLimits(admin: AdminClient, userId: string, ipHash: string | null) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const countSince = (column: "user_id" | "ip_hash", value: string) =>
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq(column, value)
      .neq("status", "failed")
      .gte("created_at", since);

  const { data: isPro } = await admin.rpc("has_active_subscription", { uid: userId });
  const { count: userCount } = await countSince("user_id", userId);

  if (isPro) {
    return (userCount ?? 0) >= LIMITS.proPerUserPerDay
      ? `Je hebt vandaag al ${LIMITS.proPerUserPerDay} contracten gescand (fair use). Probeer het morgen opnieuw.`
      : null;
  }
  if ((userCount ?? 0) >= LIMITS.freePerUserPerDay) {
    return `Je hebt vandaag al ${LIMITS.freePerUserPerDay} gratis scans gebruikt. Met Pro scan je onbeperkt.`;
  }
  if (ipHash) {
    const { count: ipCount } = await countSince("ip_hash", ipHash);
    if ((ipCount ?? 0) >= LIMITS.freePerIpPerDay) {
      return "Er zijn vanaf dit netwerk vandaag al veel gratis scans gedaan. Probeer het morgen opnieuw.";
    }
  }
  return null;
}

async function upsertDocument(
  admin: AdminClient,
  doc: {
    existingId?: string;
    userId: string;
    fileName: string;
    storagePath: string;
    fileSize: number;
    ipHash: string | null;
  },
) {
  const values = {
    user_id: doc.userId,
    file_name: doc.fileName,
    storage_path: doc.storagePath,
    file_size_bytes: doc.fileSize,
    ip_hash: doc.ipHash,
    status: "analyzing" as const,
    error_message: null,
  };
  const query = doc.existingId
    ? admin.from("documents").update(values).eq("id", doc.existingId).select("id").single()
    : admin.from("documents").insert(values).select("id").single();
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error("Document insert failed");
  return data.id;
}

async function prepareInput(bytes: Uint8Array): Promise<{ contract: ContractInput; pages: number }> {
  let extracted;
  try {
    extracted = await extractPdfText(bytes);
  } catch {
    throw new UserFacingError("Deze PDF kan niet worden gelezen. Is het bestand beveiligd met een wachtwoord?");
  }

  if (extracted.pages > MAX_PAGES) {
    throw new UserFacingError(`Dit document heeft meer dan ${MAX_PAGES} pagina's. Upload alleen het contract zelf.`);
  }
  if (extracted.text.length > MAX_TEXT_CHARS) {
    throw new UserFacingError("Dit document is te lang om in één keer te analyseren. Upload alleen het contract zelf.");
  }
  if (extracted.text.length >= MIN_TEXT_CHARS) {
    return { contract: { kind: "text", text: extracted.text }, pages: extracted.pages };
  }
  // Scanned PDF without a text layer: let Claude read the pages directly.
  return {
    contract: { kind: "pdf", base64: Buffer.from(bytes).toString("base64") },
    pages: extracted.pages,
  };
}
