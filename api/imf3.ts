import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Get query parameters
    const { query } = req;
    const type = (query.type as string || 'data').toLowerCase();
    const flowRef = (query.flowRef as string || query.resourceID as string || 'IFS');
    const key = query.key as string || '';
    const startPeriod = query.startPeriod as string;
    const endPeriod = query.endPeriod as string;
    
    // Get API key from environment
    const apiKey = process.env.IMF_API_KEY || process.env.CHART_API_KEY;
    
    console.log(`[IMF API] Request: flowRef=${flowRef}, type=${type}, key=${key}`);

    // WEO dataset: Use DataMapper API
    if (flowRef.toUpperCase() === 'WEO' && type === 'data') {
      const keyParts = key.split('.');
      const countryCode = keyParts.length === 3 ? keyParts[1] : (keyParts.length === 2 ? keyParts[0] : 'US');
      const indicator = keyParts[keyParts.length - 1];
      
      // Convert 2-letter to 3-letter ISO code
      const iso2to3: Record<string, string> = {
        "US": "USA", "GB": "GBR", "DE": "DEU", "FR": "FRA", "IT": "ITA", "ES": "ESP",
        "JP": "JPN", "CN": "CHN", "IN": "IND", "BR": "BRA", "RU": "RUS", "CA": "CAN",
        "LK": "LKA", "AU": "AUS", "MX": "MEX", "KR": "KOR", "ID": "IDN"
      };
      const country3 = iso2to3[countryCode.toUpperCase()] || countryCode;
      
      const dmUrl = `https://www.imf.org/external/datamapper/api/v1/${indicator}/${country3}`;
      
      const response = await fetch(dmUrl, {
        headers: apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`IMF API returned ${response.status}`);
      }
      
      const json: any = await response.json();
      const values = json?.values?.[indicator]?.[country3];
      
      if (!values || typeof values !== 'object') {
        throw new Error('No data in response');
      }
      
      // Convert to data points
      const startYear = startPeriod ? parseInt(startPeriod) : 0;
      const endYear = endPeriod ? parseInt(endPeriod) : 9999;
      
      const data = Object.entries(values)
        .map(([year, val]) => ({ date: String(year), value: typeof val === 'number' ? val : null }))
        .filter(p => {
          if (p.value === null) return false;
          const y = parseInt(p.date);
          return y >= startYear && y <= endYear;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      res.status(200).json({
        meta: { type, flowRef: 'WEO', key: `${country3}.${indicator}`, url: dmUrl },
        data,
        raw: json,
        attempts: [{ url: dmUrl, success: true, dataPoints: data.length }]
      });
      return;
    }

    // For other datasets, return error for now
    res.status(400).json({
      error: 'Only WEO dataset is currently supported',
      message: 'Please use flowRef=WEO'
    });
    
  } catch (error: any) {
    console.error('[IMF API] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
}
