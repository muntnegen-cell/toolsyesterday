"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AlertCircle, FileText, Loader2, Lock, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient, ensureSession } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { UserFacingError } from "@/lib/errors";
import type { AnalyzeRequest, AnalyzeResponse } from "@/types/analysis";

type Stage =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "analyzing"; fileName: string }
  | { kind: "error"; message: string };

const STEPS = {
  uploading: { progress: 30, label: "Contract veilig uploaden…" },
  analyzing: { progress: 75, label: "AI analyseert clausules op risico's…" },
} as const;

function rejectionMessage(rejections: FileRejection[]) {
  const code = rejections[0]?.errors[0]?.code;
  if (code === "file-too-large") return "Dit bestand is groter dan 10 MB.";
  if (code === "file-invalid-type") return "Alleen PDF-bestanden worden ondersteund.";
  if (code === "too-many-files") return "Upload één contract tegelijk.";
  return "Dit bestand kan niet worden geüpload.";
}

export function UploadZone({ className }: { className?: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const busy = stage.kind === "uploading" || stage.kind === "analyzing";

  const handleFile = useCallback(
    async (file: File) => {
      setStage({ kind: "uploading", fileName: file.name });
      try {
        const supabase = createClient();
        const session = await ensureSession(supabase);
        const storagePath = `${session.user.id}/${crypto.randomUUID()}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("contracts")
          .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw new UserFacingError("Uploaden mislukt. Controleer je verbinding en probeer het opnieuw.");

        setStage({ kind: "analyzing", fileName: file.name });
        const body: AnalyzeRequest = { storagePath, fileName: file.name, fileSize: file.size };
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as AnalyzeResponse | null;
        if (!res.ok || !json || "error" in json) {
          throw new UserFacingError(
            json && "error" in json ? json.error : "De analyse is mislukt. Probeer het opnieuw.",
          );
        }

        router.push(`/report/${json.documentId}`);
      } catch (err) {
        if (!(err instanceof UserFacingError)) console.error(err);
        setStage({
          kind: "error",
          message:
            err instanceof UserFacingError
              ? err.message
              : "Er ging iets mis. Controleer je verbinding en probeer het opnieuw.",
        });
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) return setStage({ kind: "error", message: rejectionMessage(rejected) });
      if (accepted[0]) void handleFile(accepted[0]);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
    noClick: true,
    disabled: busy,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-2xl border-2 border-dashed bg-card p-8 text-center shadow-sm transition-colors sm:p-10",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        busy && "border-solid",
        className,
      )}
    >
      <input {...getInputProps()} aria-label="Upload je contract (PDF)" />

      {busy ? (
        <div className="flex flex-col items-center gap-4" aria-live="polite">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          </div>
          <div className="flex max-w-full items-center gap-2 text-sm font-medium">
            <FileText className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{stage.fileName}</span>
          </div>
          <Progress value={STEPS[stage.kind].progress} className="max-w-xs" />
          <p className="text-sm text-muted-foreground">{STEPS[stage.kind].label}</p>
          {stage.kind === "analyzing" && (
            <p className="text-xs text-muted-foreground">Dit duurt meestal 20–60 seconden. Sluit dit venster niet.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <UploadCloud className="size-6 text-primary" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">
              {isDragActive ? "Laat los om te scannen" : "Sleep je contract hierheen"}
            </p>
            <p className="text-sm text-muted-foreground">PDF, maximaal 10 MB</p>
          </div>
          <Button type="button" size="lg" onClick={open}>
            Kies een PDF
          </Button>
          {stage.kind === "error" && (
            <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {stage.message}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Privé opgeslagen · alleen jij hebt toegang
          </p>
        </div>
      )}
    </div>
  );
}
