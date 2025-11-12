/**
 * Production-ready IMF SDMX 2.1 API endpoint handler
 *
 * Supports:
 *  - Data fetching from IMF datasets (WEO, IFS, etc.)
 *  - Available constraint queries for metadata
 *  - Smart key fallbacks (2-letter vs 3-letter country codes, frequency variants)
 *  - Comprehensive error handling with attempt tracking
 *  - Multiple API key header formats (Ocp-Apim-Subscription-Key, X-API-Key, apiKey)
 *
 * Usage:
 *  Data request:
 *    /api/imf3?type=data&flowRef=WEO&key=RUS.NGDPD&startPeriod=2020&endPeriod=2025
 *    /api/imf3?type=data&flowRef=IFS&key=A.US.NGDP_R_SA_IX&startPeriod=2015&endPeriod=2024
 *
 *  Availability check:
 *    /api/imf3?type=availableconstraint&flowRef=CPI&key=ALL&providerRef=all&componentID=REF_AREA&mode=exact&references=none
 *
 * Returns:
 *  { meta: {...}, data: [{date, value}, ...], raw: {...}, attempts: [...] }
 */

type SdmxPoint = { date: string; value: number | null };

interface AttemptLog {
  url: string;
  success: boolean;
  error?: string;
  dataPoints?: number;
}

const BASE = 'https://api.imf.org/external/sdmx/2.1';
const DATAMAPPER_BASE = 'https://www.imf.org/external/datamapper/api/v1';

function envKey(): string | undefined {
  const key = process.env.IMF_API_KEY || process.env.CHART_API_KEY || undefined;
  return key;
}

function buildAvailableConstraintUrl(params: {
  flowRef: string;
  key: string;
  providerRef: string;
  componentID: string;
  query?: Record<string,string|undefined>;
}): string {
  const { flowRef, key, providerRef, componentID, query = {} } = params;
  const path = `${BASE}/availableconstraint/${encodeURIComponent(flowRef)}/${encodeURIComponent(key)}/${encodeURIComponent(providerRef)}/${encodeURIComponent(componentID)}`;
  const qp = new URLSearchParams();
  Object.entries(query).forEach(([k,v]) => { if (v) qp.set(k, v); });
  return qp.toString() ? `${path}?${qp.toString()}` : path;
}

function buildDataUrl(params: { flowRef: string; key: string; query?: Record<string,string|undefined> }): string {
  const { flowRef, key, query = {} } = params;
  const path = `${BASE}/data/${encodeURIComponent(flowRef)}/${encodeURIComponent(key)}`;
  const qp = new URLSearchParams();
  Object.entries(query).forEach(([k,v]) => { if (v) qp.set(k, v); });
  return qp.toString() ? `${path}?${qp.toString()}` : path;
}

async function fetchResource(url: string, apiKey?: string): Promise<{ json: any; text: string }> {
  const headers: Record<string,string> = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  if (apiKey) {
    headers['Ocp-Apim-Subscription-Key'] = apiKey;
  }

  const res = await fetch(url, { headers });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  // Try parsing as JSON
  try {
    const parsed = JSON.parse(text);
    return { json: parsed, text };
  } catch {
    // Response might be XML or other format; return as raw text
    return { json: { raw: text }, text };
  }
}

function normalizeData(json: any): SdmxPoint[] {
  const results: SdmxPoint[] = [];
  if (!json) return results;

  // Handle CompactData -> DataSet -> Series -> Obs(s)
  // Common shapes:
  // json.CompactData.DataSet.Series (object or array)
  // Each series has Obs (object or array) containing @TIME_PERIOD/@OBS_VALUE or TIME_PERIOD/OBS_VALUE
  try {
    const compact = json.CompactData;
    if (compact && compact.DataSet) {
      const seriesNode = compact.DataSet.Series;
      const seriesArray = Array.isArray(seriesNode) ? seriesNode : (seriesNode ? [seriesNode] : []);
      for (const s of seriesArray) {
        const obsNode = s.Obs ?? s.OBS ?? s.ObsArray ?? s.OBSERVATIONS;
        const obsArray = Array.isArray(obsNode) ? obsNode : (obsNode ? [obsNode] : []);
        for (const o of obsArray) {
          const date = o['@TIME_PERIOD'] ?? o.TIME_PERIOD ?? o.time ?? o['TIME'] ?? '';
          const raw = o['@OBS_VALUE'] ?? o.OBS_VALUE ?? o['OBS'] ?? null;
          const num = (raw === null || raw === '') ? null : Number(raw);
          results.push({ date: String(date), value: Number.isFinite(num) ? num : null });
        }
      }
      // sort by date lexicographically (most SDMX dates are YYYY or YYYY-MM)
      return results.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    }
  } catch (e) {
    // ignore and try other shapes
    console.warn('normalizeData: compact parse failed', e);
  }

  // Alternate: json.data / json.observations / json.observationsSeries
  try {
    if (Array.isArray(json.observations)) {
      for (const o of json.observations) {
        const date = o.time ?? o.year ?? o.date ?? o.TIME_PERIOD ?? '';
        const val = o.value ?? o.OBS_VALUE ?? null;
        const num = val === null || val === '' ? null : Number(val);
        results.push({ date: String(date), value: Number.isFinite(num) ? num : null });
      }
      return results.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    }

    // Some portal responses use: json.data or json.values
    if (Array.isArray(json.data)) {
      for (const o of json.data) {
        const date = o.time ?? o.date ?? o.year ?? '';
        const val = o.value ?? o.Value ?? null;
        const num = val === null || val === '' ? null : Number(val);
        results.push({ date: String(date), value: Number.isFinite(num) ? num : null });
      }
      return results.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    }
  } catch (e) {
    console.warn('normalizeData: alternative parse failed', e);
  }

  // If nothing matched, return empty array
  return results;
}

/**
 * Generate fallback key variants for common IMF data structure issues:
 *  - 2-letter vs 3-letter country codes (US vs USA, RU vs RUS)
 *  - Frequency included/excluded (A.US.NGDPD vs US.NGDPD)
 *  - Dimension order (FREQ.REF_AREA.INDICATOR vs REF_AREA.INDICATOR.FREQ)
 * 
 * Priority: Try most common formats first (A.US.NGDPD for WEO)
 */
function generateKeyVariants(key: string): string[] {
  const variants: string[] = [key]; // Always try original first
  const parts = key.split('.');

  if (parts.length === 2) {
    const [area, indicator] = parts;
    // WEO prefers: A.US.NGDPD format (frequency first, 2-letter country)
    // Try 2-letter area with frequency first
    if (area.length === 3) {
      const area2 = area.slice(0, 2);
      variants.push(`A.${area2}.${indicator}`); // Priority: WEO format
    }
    // Then try adding frequency prefix/suffix with original area
    variants.push(`A.${area}.${indicator}`);
    variants.push(`${area}.${indicator}.A`);
    // Swap order
    variants.push(`${indicator}.${area}`);
    // Try 3-letter variants if 2-letter provided
    if (area.length === 2) variants.push(`${area}S.${indicator}`, `${area}A.${indicator}`);
  } else if (parts.length === 3) {
    const [f, area, indicator, ...rest] = parts;
    // Prioritize 2-letter area code variants for WEO
    if (area && area.length === 3) {
      const area2 = area.slice(0, 2);
      variants.push([f, area2, indicator, ...rest].join('.')); // Priority
    }
    if (area && area.length === 2) {
      variants.push([f, `${area}A`, indicator, ...rest].join('.'));
      variants.push([f, `${area}S`, indicator, ...rest].join('.'));
    }
    // Different dimension orders
    variants.push([f, indicator, area, ...rest].join('.'));
    variants.push([area, indicator, f, ...rest].join('.'));
    // Without frequency
    variants.push([area, indicator, ...rest].join('.'));
  }

  // De-duplicate
  return [...new Set(variants)];
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'data').toLowerCase();
  const flowRef = url.searchParams.get('flowRef') || url.searchParams.get('resourceID') || 'IFS';
  const providedKey = url.searchParams.get('key') || '';
  const providerRef = url.searchParams.get('providerRef') || 'all';
  const componentID = url.searchParams.get('componentID') || 'REF_AREA';
  const startPeriod = url.searchParams.get('startPeriod') || undefined;
  const endPeriod = url.searchParams.get('endPeriod') || undefined;
  const updatedAfter = url.searchParams.get('updatedAfter') || undefined;
  const mode = url.searchParams.get('mode') || undefined;
  const references = url.searchParams.get('references') || undefined;
  
  // Client metadata passthrough (for logging/diagnostics)
  const freq = url.searchParams.get('freq') || undefined;
  const indicatorLabel = url.searchParams.get('indicatorLabel') || undefined;
  const timeRange = url.searchParams.get('timeRange') || undefined;
  const clientTs = url.searchParams.get('clientTs') || undefined;

  const apiKey = envKey();
  const attempts: AttemptLog[] = [];

  console.log(`[imf3] flowRef=${flowRef}, type=${type}, key=${providedKey}`);

  // WEO dataset: Use DataMapper API (JSON format) instead of SDMX which returns empty data
  if (flowRef.toUpperCase() === 'WEO' && type === 'data') {
    // Parse key: expected format is "A.LK.NGDPD" → extract country (LK) and indicator (NGDPD)
    const keyParts = providedKey.split('.');
    const countryCode = keyParts.length === 3 ? keyParts[1] : (keyParts.length === 2 ? keyParts[0] : 'US');
    const indicator = keyParts[keyParts.length - 1];
    
    // Convert 2-letter to 3-letter ISO code for DataMapper (LK→LKA, US→USA)
    const iso2to3: Record<string, string> = {
      "US": "USA", "GB": "GBR", "DE": "DEU", "FR": "FRA", "IT": "ITA", "ES": "ESP",
      "JP": "JPN", "CN": "CHN", "IN": "IND", "BR": "BRA", "RU": "RUS", "CA": "CAN",
      "AU": "AUS", "MX": "MEX", "KR": "KOR", "ID": "IDN", "TR": "TUR", "SA": "SAU",
      "AR": "ARG", "ZA": "ZAF", "NG": "NGA", "EG": "EGY", "PK": "PAK", "BD": "BGD",
      "VN": "VNM", "PH": "PHL", "TH": "THA", "MY": "MYS", "SG": "SGP", "NL": "NLD",
      "BE": "BEL", "CH": "CHE", "SE": "SWE", "NO": "NOR", "DK": "DNK", "FI": "FIN",
      "PL": "POL", "AT": "AUT", "CZ": "CZE", "HU": "HUN", "RO": "ROU", "GR": "GRC",
      "PT": "PRT", "IE": "IRL", "NZ": "NZL", "IL": "ISR", "CL": "CHL", "CO": "COL",
      "PE": "PER", "VE": "VEN", "EC": "ECU", "UA": "UKR", "IQ": "IRQ", "IR": "IRN",
      "DZ": "DZA", "MA": "MAR", "TN": "TUN", "KE": "KEN", "ET": "ETH", "GH": "GHA",
      "LK": "LKA", "NP": "NPL", "AF": "AFG", "MM": "MMR", "KH": "KHM", "LA": "LAO",
    };
    const country3 = iso2to3[countryCode.toUpperCase()] || countryCode;
    
    const dmUrl = `${DATAMAPPER_BASE}/${indicator}/${country3}`;
    
    try {
      const res = await fetch(dmUrl, {
        headers: apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json: any = await res.json();
      const values = json?.values?.[indicator]?.[country3];
      
      if (!values || typeof values !== 'object') {
        throw new Error('No data in response');
      }
      
      // Convert {2020: 84.5, 2021: 88.2, ...} to [{date: '2020', value: 84.5}, ...]
      // Filter by startPeriod and endPeriod
      const startYear = startPeriod ? parseInt(startPeriod) : 0;
      const endYear = endPeriod ? parseInt(endPeriod) : 9999;
      
      const data: SdmxPoint[] = Object.entries(values)
        .map(([year, val]) => ({ date: String(year), value: typeof val === 'number' ? val : null }))
        .filter(p => {
          if (p.value === null) return false;
          const y = parseInt(p.date);
          return y >= startYear && y <= endYear;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      attempts.push({ url: dmUrl, success: true, dataPoints: data.length });
      
      return new Response(JSON.stringify({
        meta: { type, flowRef: 'WEO', key: `${country3}.${indicator}`, url: dmUrl, freq: 'A', indicatorLabel, timeRange, clientTs },
        data,
        raw: json,
        attempts
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e: any) {
      attempts.push({ url: dmUrl, success: false, error: e?.message });
      // Fall through to SDMX fallback
    }
  }

  // World Bank dataset: Use World Bank API for health and environment indicators
  if (flowRef.toUpperCase() === 'WORLDBANK' && type === 'data') {
    // Parse key to extract country and indicator
    // Format: A.IN.SH.XPD.CHEX.GD.ZS → freq=A, country=IN, indicator=SH.XPD.CHEX.GD.ZS
    const keyParts = providedKey.split('.');
    const freq = keyParts[0]; // A, M, Q
    const countryCode = keyParts[1]; // IN, LK, US, etc.
    const indicator = keyParts.slice(2).join('.'); // Everything after country code
    
    // World Bank uses 3-letter ISO codes
    const iso2to3: Record<string, string> = {
      "US": "USA", "GB": "GBR", "DE": "DEU", "FR": "FRA", "IT": "ITA", "ES": "ESP",
      "JP": "JPN", "CN": "CHN", "IN": "IND", "BR": "BRA", "RU": "RUS", "CA": "CAN",
      "AU": "AUS", "MX": "MEX", "KR": "KOR", "ID": "IDN", "TR": "TUR", "SA": "SAU",
      "AR": "ARG", "ZA": "ZAF", "NG": "NGA", "EG": "EGY", "PK": "PAK", "BD": "BGD",
      "VN": "VNM", "PH": "PHL", "TH": "THA", "MY": "MYS", "SG": "SGP", "NL": "NLD",
      "BE": "BEL", "CH": "CHE", "SE": "SWE", "NO": "NOR", "DK": "DNK", "FI": "FIN",
      "PL": "POL", "AT": "AUT", "CZ": "CZE", "HU": "HUN", "RO": "ROU", "GR": "GRC",
      "PT": "PRT", "IE": "IRL", "NZ": "NZL", "IL": "ISR", "CL": "CHL", "CO": "COL",
      "PE": "PER", "VE": "VEN", "EC": "ECU", "UA": "UKR", "IQ": "IRQ", "IR": "IRN",
      "DZ": "DZA", "MA": "MAR", "TN": "TUN", "KE": "KEN", "ET": "ETH", "GH": "GHA",
      "LK": "LKA", "NP": "NPL", "AF": "AFG", "MM": "MMR", "KH": "KHM", "LA": "LAO",
    };
    const country3 = iso2to3[countryCode.toUpperCase()] || countryCode.toUpperCase();
    
    console.log(`[imf3] World Bank: country=${countryCode} → ${country3}, indicator=${indicator}`);
    
    // World Bank API format: /v2/country/{country}/indicator/{indicator}?format=json&date={start}:{end}
    const startYear = startPeriod || '1980';
    const endYear = endPeriod || new Date().getFullYear().toString();
    const wbUrl = `https://api.worldbank.org/v2/country/${country3}/indicator/${indicator}?format=json&date=${startYear}:${endYear}&per_page=500`;
    
    try {
      console.log(`[imf3] World Bank -> ${wbUrl}`);
      const res = await fetch(wbUrl);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json: any = await res.json();
      console.log(`[imf3] World Bank response:`, JSON.stringify(json).substring(0, 500));
      
      // World Bank returns [metadata, data_array]
      const dataArray = Array.isArray(json) && json.length > 1 ? json[1] : [];
      
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error('No data in response');
      }
      
      // Convert World Bank format to our format
      // World Bank: [{date: "2020", value: 123.45, ...}, ...]
      const data: SdmxPoint[] = dataArray
        .filter((item: any) => item.value !== null && item.value !== undefined)
        .map((item: any) => ({
          date: String(item.date || item.year),
          value: typeof item.value === 'number' ? item.value : parseFloat(item.value)
        }))
        .filter(p => !isNaN(p.value as number))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      attempts.push({ url: wbUrl, success: true, dataPoints: data.length });
      
      console.log(`[imf3] World Bank returned ${data.length} points`);
      
      return new Response(JSON.stringify({
        meta: { type, flowRef: 'WORLDBANK', key: `${country3}.${indicator}`, url: wbUrl, freq: 'A', indicatorLabel, timeRange, clientTs },
        data,
        raw: json,
        attempts
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e: any) {
      console.error(`[imf3] World Bank failed:`, e?.message);
      attempts.push({ url: wbUrl, success: false, error: e?.message });
      // Return error for World Bank
      return new Response(JSON.stringify({
        error: e?.message || 'World Bank data unavailable',
        message: `Failed to fetch from World Bank API`,
        meta: { type, flowRef: 'WORLDBANK', requestedKey: providedKey, indicatorLabel, timeRange, clientTs },
        data: [],
        attempts
      }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  // Build query object
  const query: Record<string,string|undefined> = { startPeriod, endPeriod, updatedAfter, mode, references };

  // For availability constraint, use provided key or 'ALL'
  if (type === 'availableconstraint') {
    const pathKey = providedKey || 'ALL';
    const targetUrl = buildAvailableConstraintUrl({ flowRef, key: pathKey, providerRef, componentID, query });

    try {
      console.log(`[imf3] availableconstraint -> ${targetUrl}`);
      const { json } = await fetchResource(targetUrl, apiKey);
      attempts.push({ url: targetUrl, success: true });

      return new Response(JSON.stringify({
        meta: { type, flowRef, key: pathKey, providerRef, componentID, url: targetUrl, freq, indicatorLabel, timeRange, clientTs },
        data: [],
        raw: json,
        attempts
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e: any) {
      attempts.push({ url: targetUrl, success: false, error: e?.message });
      console.error(`[imf3] availableconstraint failed:`, e?.message);
      return new Response(JSON.stringify({
        error: e?.message || 'Availability query failed',
        meta: { type, flowRef, key: pathKey, url: targetUrl },
        attempts
      }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  // DATA request with smart fallbacks
  const keyVariants = providedKey ? generateKeyVariants(providedKey) : ['ALL'];
  let finalJson: any = null;
  let finalData: SdmxPoint[] = [];
  let successUrl = '';

  for (const keyVariant of keyVariants) {
    const targetUrl = buildDataUrl({ flowRef, key: keyVariant, query });
    
    try {
      console.log(`[imf3] trying data -> ${targetUrl}`);
      const { json } = await fetchResource(targetUrl, apiKey);
      const normalized = normalizeData(json);
      
      attempts.push({ url: targetUrl, success: true, dataPoints: normalized.length });

      if (normalized.length > 0) {
        // Found data! Use this variant
        finalJson = json;
        finalData = normalized;
        successUrl = targetUrl;
        break;
      } else {
        // Response OK but no observations; continue trying variants
        console.log(`[imf3] no data in response for key ${keyVariant}`);
      }
    } catch (e: any) {
      attempts.push({ url: targetUrl, success: false, error: e?.message });
      console.error(`[imf3] fetch failed for key ${keyVariant}:`, e?.message);
      // Continue to next variant
    }
  }

  // Build response
  if (finalData.length > 0) {
    return new Response(JSON.stringify({
      meta: {
        type,
        flowRef,
        key: successUrl.split('/').pop()?.split('?')[0] || providedKey,
        url: successUrl,
        freq,
        indicatorLabel,
        timeRange,
        clientTs,
        variantsTried: attempts.length
      },
      data: finalData,
      raw: finalJson,
      attempts
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } else {
    // All variants failed or returned no data
    const lastAttempt = attempts[attempts.length - 1];
    return new Response(JSON.stringify({
      error: lastAttempt?.error || 'No data available for any key variant',
      message: `Tried ${attempts.length} key variant(s) for ${flowRef}. Check meta.attempts for details.`,
      meta: {
        type,
        flowRef,
        requestedKey: providedKey,
        freq,
        indicatorLabel,
        timeRange,
        clientTs
      },
      data: [],
      attempts
    }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  }
}

/**
 * Export helpers for common Node/Express/Serverless adapters:
 *
 * - For serverless (Edge / Cloudflare Workers) you can export `onRequest` / default = handler as used below.
 * - For Express: wrap handler by creating a Request-like object or use the "imf3" wrapper below (see export default).
 */

export default async function imf3Adapter(req: any, res: any) {
  try {
    // Construct a Request for environments that don't give you one directly
    const incomingUrl = req.url?.startsWith('http') ? req.url : `http://localhost${req.url}`;
    const r = await handler(new Request(incomingUrl, { method: req.method, headers: req.headers } as any));
    const body = await r.text();
    const contentType = r.headers.get('content-type') || 'application/json';
    res.status(r.status).setHeader('content-type', contentType).send(body);
  } catch (err: any) {
    console.error('imf3Adapter error', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}

// Serverless-friendly export
export const onRequest = handler;
