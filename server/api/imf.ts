// Serverless-style API endpoint to fetch IMF data and normalize it for charts.
// Reads IMF API key from process.env.IMF_API_KEY.
// Query params: dataset, indicator, refArea (2- or 3-letter), startPeriod, endPeriod.
// Returns: { meta: {...}, data: Array<{ date: string, value: number|null }> }

type NormalizedPoint = { date: string; value: number | null };

const IMF_BASE = "https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData";

async function fetchImfSeries(dataset: string, refAreaKey: string, indicator: string, startPeriod?: string, endPeriod?: string, apiKey?: string) {
  const sp = startPeriod ? `&startPeriod=${encodeURIComponent(startPeriod)}` : "";
  const ep = endPeriod ? `&endPeriod=${encodeURIComponent(endPeriod)}` : "";
  const ap = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : ""; // Some deployments accept api_key in query
  const url = `${IMF_BASE}/${encodeURIComponent(dataset)}/${encodeURIComponent(refAreaKey)}.${encodeURIComponent(indicator)}?format=json${sp}${ep}${ap}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // Some IMF services accept API key via header name variations; include a couple of common ones.
      "X-IMF-API-Key": apiKey || "",
      "apikey": apiKey || "",
    },
  });
  if (!res.ok) {
    throw new Error(`IMF fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json;
}

function normalizeImfCompactData(json: any): NormalizedPoint[] {
  // IMF SDMX CompactData shape: { CompactData: { DataSet: { Series: { Obs: [{\n @TIME_PERIOD, @OBS_VALUE }] } } } }
  try {
    const series = json?.CompactData?.DataSet?.Series;
    if (!series) return [];
    const obs = Array.isArray(series?.Obs) ? series.Obs : (series?.Obs ? [series.Obs] : []);
    const points: NormalizedPoint[] = obs.map((o: any) => {
      const date = o?.['@TIME_PERIOD'] || o?.TIME_PERIOD || o?.time || "";
      const raw = o?.['@OBS_VALUE'] ?? o?.OBS_VALUE ?? null;
      const value = raw === null || raw === undefined || raw === "" ? null : Number(raw);
      return { date, value: isFinite(value as number) ? (value as number) : null };
    });
    // Sort by date ascending if they look like YYYY or YYYY-MM
    return points.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } catch {
    return [];
  }
}

async function toISO2IfNeeded(refArea: string): Promise<string[]> {
  const candidates = new Set<string>([refArea.toUpperCase()]);
  // If 3-letter, try to fetch ISO2 via Rest Countries as a best-effort fallback
  if (refArea.length === 3) {
    try {
      const r = await fetch(`https://restcountries.com/v3.1/alpha/${encodeURIComponent(refArea)}`);
      if (r.ok) {
        const d = await r.json();
        const iso2 = Array.isArray(d) && d.length > 0 && d[0]?.cca2 ? String(d[0].cca2).toUpperCase() : null;
        if (iso2) candidates.add(iso2);
      }
    } catch {}
  }
  return Array.from(candidates);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const dataset = url.searchParams.get("dataset") || "IFS"; // default to International Financial Statistics
  const indicator = url.searchParams.get("indicator") || "PCPI_IX"; // default: CPI index
  const refArea = url.searchParams.get("refArea") || "US";
  const startPeriod = url.searchParams.get("startPeriod") || undefined;
  const endPeriod = url.searchParams.get("endPeriod") || undefined;
  const apiKey = (process as any)?.env?.IMF_API_KEY || (globalThis as any)?.IMF_API_KEY;

  const areas = await toISO2IfNeeded(refArea);
  let data: NormalizedPoint[] = [];
  let tried: string[] = [];

  for (const area of areas) {
    tried.push(area);
    try {
      const json = await fetchImfSeries(dataset, area, indicator, startPeriod, endPeriod, apiKey);
      data = normalizeImfCompactData(json);
      if (data.length > 0) {
        break;
      }
    } catch (e) {
      // continue to next candidate
    }
  }

  return new Response(JSON.stringify({
    meta: { dataset, indicator, refArea, tried },
    data,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Export handlers for different serverless runtimes
export default async function vercelStyle(req: any, res: any) {
  try {
    const response = await handleRequest(new Request(req.url, { method: req.method, headers: req.headers } as any));
    const body = await response.text();
    res.status(response.status).setHeader("content-type", response.headers.get("content-type") || "application/json").send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal Server Error" });
  }
}

export const onRequest = handleRequest; // Cloudflare/Netlify style
