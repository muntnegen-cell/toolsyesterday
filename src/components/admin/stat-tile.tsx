import { Card, CardContent } from "@/components/ui/card";

export function StatTile({ label, value, context }: { label: string; value: string; context?: string }) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex flex-col gap-1 px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {context && <p className="text-xs text-muted-foreground">{context}</p>}
      </CardContent>
    </Card>
  );
}
