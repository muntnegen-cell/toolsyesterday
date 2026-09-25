export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Niche Doc Scanner</p>
        <p className="max-w-xl sm:text-right">
          Deze scan is geautomatiseerd en geen vervanging van juridisch advies. Twijfel je? Laat je contract
          controleren door een jurist.
        </p>
      </div>
    </footer>
  );
}
