// Liveness probe for the Docker healthcheck; deliberately touches no external service.
export function GET() {
  return Response.json({ ok: true });
}
