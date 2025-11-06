// This endpoint has been deprecated in favor of SDMX 3.0 handler in server/api/imf3.ts.
// Keeping a small stub to avoid import/runtime errors if any stale code calls /api/imf.

export default async function deprecatedImf(req: any, res: any) {
  res.status(410).json({ error: "Deprecated: Use /api/imf3 instead." });
}

export async function onRequest(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ error: "Deprecated: Use /api/imf3 instead." }), {
    status: 410,
    headers: { "content-type": "application/json" },
  });
}
