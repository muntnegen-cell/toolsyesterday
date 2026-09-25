"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisPending({ message, intervalMs = 3000 }: { message: string; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <Card aria-live="polite" aria-busy="true">
      <CardContent className="flex flex-col items-center gap-6 py-6 sm:flex-row">
        <div className="flex size-36 shrink-0 items-center justify-center rounded-full border-[10px] border-muted">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
        <div className="flex w-full flex-col gap-3">
          <p className="font-medium">{message}</p>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}
