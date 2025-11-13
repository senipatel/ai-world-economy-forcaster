/**
 * Vercel Serverless Function wrapper for IMF API
 * Delegates to the actual handler in server/api/imf3.ts
 */

import { onRequest } from '../server/api/imf3';

export default async function handler(req: any, res: any) {
  try {
    // Construct a Web API Request object
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;
    
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    } as any);

    const response = await onRequest(request);
    
    // Convert Web API Response to Vercel response
    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    
    res.status(response.status)
      .setHeader('content-type', contentType)
      .send(body);
  } catch (err: any) {
    console.error('[api/imf3] Error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
