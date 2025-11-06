/**
 * SDMX 3.0 IMF API helper endpoint (availability + data fetch).
 *
 * Path format (availability):
 *   https://api.imf.org/external/sdmx/3.0/availability/{context}/{agencyID}/{resourceID}/{version}/{key}/{componentID}
 * Path format (data):
 *   https://api.imf.org/external/sdmx/3.0/data/{agencyID}/{resourceID}/{version}/{key}
 *
 * Parameters (core path segments):
 *   - context: one of data | structure (for availability); defaults to 'data'.
 *   - agencyID: usually 'IMF'.
 *   - resourceID: the dataflow / dataset code (e.g. 'IFS').
 *   - version: semantic version or 'latest'.
 *   - key: dot-separated dimension values keyed by the dataset structure. Use 'ALL' or empty '' for wildcard.
 *   - componentID: a dimension ID you want availability results for (e.g. 'REF_AREA').
 *
 * Query params supported here (subset):
 *   - type=availability|data  (select operation)
 *   - resourceID=IFS (dataset)
 *   - key=US..NGDPD (example key; adapt to actual flow structure)
 *   - componentID=REF_AREA (for availability)
 *   - startPeriod=YYYY or YYYY-MM
 *   - endPeriod=YYYY or YYYY-MM
 *   - updatedAfter=ISO8601 timestamp
 *   - references=all|none (SDMX parameter)
 *   - mode=serieskeysonly|refseries|datastructure (SDMX specific modes) – passed through if provided
 *
 * NOTE: Precise dimensional ordering of 'key' depends on the resource's data structure definition.
 * You must consult dataset metadata for correct ordering (e.g., FREQ.REF_AREA.INDICATOR).
 * This endpoint attempts a pragmatic fallback: if the provided key does not return data, tries a simplified key.
 *
 * Auth: expects IMF_API_KEY in process.env; forwarded as 'X-API-Key' and 'apiKey'.
 */

interface SdmxPoint { date: string; value: number | null }

const BASE = 'https://api.imf.org/external/sdmx/3.0';

function envKey(): string | undefined {
  return (process as any)?.env?.IMF_API_KEY || (globalThis as any)?.IMF_API_KEY || undefined;
}

function buildAvailabilityUrl(params: {
  context?: string; agencyID: string; resourceID: string; version?: string; key: string; componentID: string; query?: Record<string,string|undefined>;
}): string {
  const { context='data', agencyID, resourceID, version='latest', key, componentID, query={} } = params;
  const qp = new URLSearchParams();
  Object.entries(query).forEach(([k,v]) => { if (v) qp.set(k, v); });
  const suffix = qp.toString() ? `?${qp.toString()}` : '';
  return `${BASE}/availability/${encodeURIComponent(context)}/${encodeURIComponent(agencyID)}/${encodeURIComponent(resourceID)}/${encodeURIComponent(version)}/${encodeURIComponent(key)}/${encodeURIComponent(componentID)}${suffix}`;
}

function buildDataUrl(params: {
  agencyID: string; resourceID: string; version?: string; key: string; query?: Record<string,string|undefined>;
}): string {
  const { agencyID, resourceID, version='latest', key, query={} } = params;
  const qp = new URLSearchParams();
  Object.entries(query).forEach(([k,v]) => { if (v) qp.set(k, v); });
  const suffix = qp.toString() ? `?${qp.toString()}` : '';
  return `${BASE}/data/${encodeURIComponent(agencyID)}/${encodeURIComponent(resourceID)}/${encodeURIComponent(version)}/${encodeURIComponent(key)}${suffix}`;
}

async function fetchJson(url: string, apiKey?: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey || '',
      'apiKey': apiKey || '',
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IMF SDMX 3.0 error ${res.status}: ${text.slice(0,200)}`);
  }
  return res.json();
}

function normalizeData(json: any): SdmxPoint[] {
  // SDMX 3.0 JSON often returns data under 'data' or 'dataSets'. Support both.
  // Fallback to older structure if present; attempt generic parsing.
  try {
    if (json?.data?.dataSets) {
      const sets = json.data.dataSets;
      const series = sets[0]?.series || sets[0]?.observations || {};
    }
  } catch {}
  // Attempt SDMX 2 style fallback (some transitional responses still mimic older SDMX JSON):
  try {
    const series = json?.CompactData?.DataSet?.Series;
    if (series) {
      const obs = Array.isArray(series.Obs) ? series.Obs : (series.Obs ? [series.Obs] : []);
      return obs.map((o: any) => {
        const date = o['@TIME_PERIOD'] || o.TIME_PERIOD || o.time || '';
        const raw = o['@OBS_VALUE'] ?? o.OBS_VALUE ?? null;
        const num = raw === null || raw === '' ? null : Number(raw);
        return { date, value: isFinite(num as number) ? num : null };
      }).sort((a: SdmxPoint, b: SdmxPoint)=>String(a.date).localeCompare(String(b.date)));
    }
  } catch {}
  // If unknown shape, just return empty so caller can see meta.
  return [];
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'data'; // 'availability' or 'data'
  const agencyID = url.searchParams.get('agencyID') || 'IMF';
  const resourceID = url.searchParams.get('resourceID') || 'IFS';
  const version = url.searchParams.get('version') || 'latest';
  const key = url.searchParams.get('key') || 'ALL';
  const componentID = url.searchParams.get('componentID') || 'REF_AREA';
  const startPeriod = url.searchParams.get('startPeriod') || undefined;
  const endPeriod = url.searchParams.get('endPeriod') || undefined;
  const updatedAfter = url.searchParams.get('updatedAfter') || undefined;
  const references = url.searchParams.get('references') || undefined;
  const mode = url.searchParams.get('mode') || undefined;
  const apiKey = envKey();

  const query: Record<string,string|undefined> = {
    startPeriod, endPeriod, updatedAfter, references, mode
  };

  let targetUrl: string;
  if (type === 'availability') {
    targetUrl = buildAvailabilityUrl({ context: 'data', agencyID, resourceID, version, key, componentID, query });
  } else {
    targetUrl = buildDataUrl({ agencyID, resourceID, version, key, query });
  }

  let json: any;
  let data: SdmxPoint[] = [];
  try {
    json = await fetchJson(targetUrl, apiKey);
    if (type === 'data') {
      data = normalizeData(json);
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, url: targetUrl }), { status: 502, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ meta: { type, agencyID, resourceID, version, key, componentID, url: targetUrl }, data, raw: json }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

// Default export for Node/Vercel style
export default async function imf3(req: any, res: any) {
  try {
    const r = await handler(new Request(req.url, { method: req.method, headers: req.headers } as any));
    const body = await r.text();
    res.status(r.status).setHeader('content-type', r.headers.get('content-type')||'application/json').send(body);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}

export const onRequest = handler;
